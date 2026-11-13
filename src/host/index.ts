/**
 * The Host half: it observes the agent, classifies what happened, and fans one
 * event out to the phone (Bark) and to every attached browser (SSE).
 *
 * The browser half is a presentation layer only: it never classifies, so the two
 * channels can never disagree about what "finished" means.
 */
import type { Context } from '@deepseek-ai/cordis'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { classifyTurnEnd, truncate, type NotificationEvent, type NotificationKind } from '../core/events.ts'
import { approvalBody, completedBody, failedBody, hostLanguageTag, interruptedBody, questionBody, resolveLocale } from '../core/render.ts'
import { publicConfig } from '../core/config.ts'
import type { Presence } from '../core/policy.ts'
import { ConfigStore } from './store.ts'
import { Dispatcher } from './dispatcher.ts'
import { SseHub, type SseSink } from './sse.ts'
import { pushBark } from './bark.ts'
import { composeTitle } from './title.ts'
import { fromLegacy } from './migrate.ts'
import type { DshHost, SessionEventLike, SessionLike } from './types.ts'

export const name = 'dsh-notify'
export const inject = ['connection']

/** Routes below Connection's authentication fence; non-owner peers get 403. */
const ROUTES = {
  stream: '/api/dsh-notify/stream',
  config: '/api/dsh-notify/config',
  presence: '/api/dsh-notify/presence',
  state: '/api/dsh-notify/state',
  test: '/api/dsh-notify/test',
} as const

/** How often an idle SSE connection is kept warm. */
const HEARTBEAT_MS = 25_000

/**
 * How long a completed turn waits before it is announced.
 *
 * A queued prompt starts the next turn within this window; holding the notice
 * lets that turn cancel it, so a chain of continuations produces one card at the
 * real end of the work.
 */
const SETTLE_MS = 900

/** What the notifier remembers about one session. */
interface SessionMemory {
  /** Latest assistant text, used as the completion body. */
  text: string
  /** Display title last read from the title service. */
  title: string
}

/** Apply the plugin. */
export function apply(ctx: Context): void {
  const host = ctx as unknown as DshHost
  const store = new ConfigStore({
    file: configPath(host),
    legacyFile: legacyConfigPath(host),
    migrate: fromLegacy,
    warn: (message) => host.logger?.warn?.(message),
  })
  store.load()

  const hub = new SseHub()
  const memories = new Map<string, SessionMemory>()
  const settling = new Map<string, ReturnType<typeof setTimeout>>()
  let presence: Presence | null = null

  const dispatcher = new Dispatcher({
    config: () => store.get(),
    presence: () => presence,
    browser: (event, title) => hub.broadcast({ event: 'notification', data: JSON.stringify({ ...event, title }) }),
    bark: (event, title) => pushBark(store.get(), event, title),
    log: (message) => host.logger?.warn?.(message),
  })

  const encoder = new TextEncoder()

  host.effect(() => {
    const timer = setInterval(() => hub.heartbeat(), HEARTBEAT_MS)
    return () => {
      clearInterval(timer)
      for (const pending of settling.values()) clearTimeout(pending)
      settling.clear()
    }
  }, 'dsh-notify: heartbeat')

  host.on('session/event', (session: SessionLike, event: SessionEventLike) => {
    const memory = memoryOf(memories, host, session)
    if (event.type === 'turn/start') {
      // A continuation supersedes the completion that was waiting to be announced.
      const pending = settling.get(session.id)
      if (pending !== undefined) {
        clearTimeout(pending)
        settling.delete(session.id)
      }
      return
    }
    if (event.type === 'assistant/message') {
      const text = assistantText(event.data)
      if (text.length > 0) memory.text = text
      return
    }
    if (event.type !== 'turn/end') return

    const data = event.data as { turn?: number; reason?: unknown } | undefined
    const outcome = classifyTurnEnd(data?.reason as Parameters<typeof classifyTurnEnd>[0])
    if (outcome.kind === 'silent') return

    const locale = resolveLocale(store.get().locale, hostLanguageTag())
    const body = outcome.kind === 'completed'
      ? truncate(completedBody(memory.text, locale))
      : outcome.kind === 'failed'
        ? truncate(failedBody(outcome.code, outcome.message, locale))
        : truncate(interruptedBody(outcome.reason, locale))
    const kind: NotificationKind = outcome.kind
    const partial = {
      id: `turn:${session.id}:${data?.turn ?? 0}`,
      kind,
      body,
      ...(data?.turn !== undefined ? { turn: data.turn } : {}),
    }

    if (kind === 'completed') {
      const timer = setTimeout(() => {
        settling.delete(session.id)
        dispatch(partial, session)
      }, SETTLE_MS)
      settling.set(session.id, timer)
      return
    }
    dispatch(partial, session)
  })

  host.on('user-questions/request', (request: QuestionRequestLike, next: () => Promise<unknown>) => {
    const session = request.agent?.session
    if (session !== undefined) {
      const lines = (request.questions ?? []).map((question) => {
        const header = question.header !== undefined && question.header.length > 0 ? `${question.header}: ` : ''
        const options = question.options !== undefined && question.options.length > 0
          ? ` (${question.options.map((option) => option.label).join(' / ')})`
          : ''
        return `${header}${question.question}${options}`
      })
      const locale = resolveLocale(store.get().locale, hostLanguageTag())
      dispatch({
        id: `question:${session.id}:${Date.now()}`,
        kind: 'question',
        body: truncate(questionBody(lines.join('\n'), locale)),
      }, session)
    }
    return next()
  })

  host.on('approval/request', (request: ApprovalRequestLike, next: () => Promise<unknown>) => {
    const session = request.agent?.session
    if (session !== undefined) {
      const locale = resolveLocale(store.get().locale, hostLanguageTag())
      const detail = localizedReason(request.displayReason, locale) ?? request.reason ?? ''
      dispatch({
        id: `approval:${request.callId ?? request.id ?? session.id}:${Date.now()}`,
        kind: 'approval',
        body: truncate(approvalBody(request.toolName ?? '', detail, locale)),
      }, session)
    }
    return next()
  })

  host.effect(() => {
    const disposers = [
      host.connection.fetch.register({
        path: ROUTES.stream,
        methods: ['GET'],
        requestBody: 'buffered',
        fetch: (request) => Promise.resolve(openStream(hub, encoder, request)),
      }),
      host.connection.fetch.register({
        path: ROUTES.config,
        methods: ['GET', 'POST'],
        requestBody: 'buffered',
        fetch: async (request) => {
          if (request.method === 'GET') return json({ ok: true, config: publicConfig(store.get()) })
          const patch: unknown = await request.json().catch(() => null)
          return json({ ok: true, config: publicConfig(store.update(patch)) })
        },
      }),
      host.connection.fetch.register({
        path: ROUTES.presence,
        methods: ['POST'],
        requestBody: 'buffered',
        fetch: async (request) => {
          const body = (await request.json().catch(() => null)) as Partial<Presence> | null
          if (body === null || typeof body.visible !== 'boolean' || typeof body.focused !== 'boolean') {
            return json({ ok: false, error: 'invalid presence' }, 400)
          }
          presence = {
            visible: body.visible,
            focused: body.focused,
            sessionId: typeof body.sessionId === 'string' ? body.sessionId : null,
            at: Date.now(),
          }
          return json({ ok: true })
        },
      }),
      host.connection.fetch.register({
        path: ROUTES.state,
        methods: ['GET'],
        requestBody: 'buffered',
        fetch: () => Promise.resolve(json({
          ok: true,
          browsers: hub.size,
          channels: {
            browser: store.get().browser.enabled,
            bark: store.get().bark.enabled && store.get().bark.deviceKey.trim().length > 0,
          },
          presence,
        })),
      }),
      host.connection.fetch.register({
        path: ROUTES.test,
        methods: ['POST'],
        requestBody: 'buffered',
        fetch: async (request) => {
          const body = (await request.json().catch(() => ({}))) as { channel?: string }
          const config = store.get()
          const event: NotificationEvent = {
            id: `test:${Date.now()}`,
            kind: 'completed',
            sessionId: 'dsh-notify-test',
            sessionTitle: 'DeepSeek Harness',
            body: 'This is a test notification from dsh-notify.',
            at: Date.now(),
          }
          const title = composeTitle(config.prefix, 'completed', event.sessionTitle)
          if (body.channel === 'bark') {
            const result = await pushBark(config, event, title)
            return json({ ok: result.ok, channel: 'bark', result })
          }
          hub.broadcast({ event: 'notification', data: JSON.stringify({ ...event, title, test: true }) })
          return json({ ok: hub.size > 0, channel: 'browser', browsers: hub.size })
        },
      }),
    ]
    return () => {
      for (const dispose of disposers) void dispose()
    }
  }, 'dsh-notify: routes')

  /** Classify-time dispatch: reads the session's title and subagent fact. */
  function dispatch(partial: Pick<NotificationEvent, 'id' | 'kind' | 'body' | 'turn'>, session: SessionLike): void {
    const config = store.get()
    if (!config.events[partial.kind].enabled) return
    const memory = memoryOf(memories, host, session)
    const event: NotificationEvent = {
      id: partial.id,
      kind: partial.kind,
      sessionId: session.id,
      sessionTitle: memory.title,
      body: partial.body,
      at: Date.now(),
      ...(partial.turn !== undefined ? { turn: partial.turn } : {}),
    }
    dispatcher.dispatch(event, { subagent: isSubagent(session) })
  }
}

/** The approval payload the plugin reads. */
interface ApprovalRequestLike {
  readonly id?: string
  readonly callId?: string
  readonly toolName?: string
  readonly reason?: string
  readonly displayReason?: Readonly<Record<string, string>>
  readonly agent?: { readonly session?: SessionLike }
}

/** Pick the reader's localized reason, falling back to English. */
function localizedReason(display: Readonly<Record<string, string>> | undefined, locale: 'zh' | 'en'): string | undefined {
  if (display === undefined) return undefined
  const preferred = display[locale] ?? display.en
  return typeof preferred === 'string' && preferred.trim().length > 0 ? preferred : undefined
}

/** The question payload the plugin reads. */
interface QuestionRequestLike {
  readonly agent?: { readonly session?: SessionLike }
  readonly questions?: readonly {
    readonly header?: string
    readonly question: string
    readonly options?: readonly { readonly label: string }[]
  }[]
}

/** Read and cache one session's display facts. */
function memoryOf(memories: Map<string, SessionMemory>, host: DshHost, session: SessionLike): SessionMemory {
  const existing = memories.get(session.id)
  if (existing !== undefined) {
    // A title is generated from the first message, so an early default must not
    // stick to every later notification for that session.
    if (existing.title === FALLBACK_TITLE) existing.title = readTitle(host, session)
    return existing
  }
  if (memories.size > 500) memories.clear()
  const memory: SessionMemory = { text: '', title: readTitle(host, session) }
  memories.set(session.id, memory)
  return memory
}

/** The label used before a session has a generated title. */
const FALLBACK_TITLE = 'DeepSeek Harness'

/** Read the folded session title, falling back to a stable label. */
function readTitle(host: DshHost, session: SessionLike): string {
  try {
    const title = host.sessionTitle?.get(session)?.title?.trim()
    if (title !== undefined && title.length > 0) return title
  } catch {
    // A missing title service must not break notifications.
  }
  return FALLBACK_TITLE
}

/** Whether one session was spawned by another session. */
function isSubagent(session: SessionLike): boolean {
  return session.header?.origin === 'subagent' || (session.header?.delegationDepth ?? 0) > 0
}

/** Extract the plain text of one assistant message. */
function assistantText(data: unknown): string {
  const message = (data as { message?: { content?: readonly { type?: string; text?: string }[] } } | null)?.message
  if (message?.content === undefined) return ''
  return message.content
    .filter((block) => block.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text ?? '')
    .join('\n')
    .trim()
}

/** Describe a failure in one line. */
function describeFailure(code: string | null, message: string): string {
  return code !== null && !message.includes(code) ? `${message} (${code})` : message
}

/** Answer one SSE stream request. */
function openStream(hub: SseHub, encoder: TextEncoder, request: Request): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const sink: SseSink = {
        write(frame) {
          controller.enqueue(encoder.encode(frame))
        },
        onClose(listener) {
          request.signal.addEventListener('abort', listener, { once: true })
        },
      }
      const remove = hub.add(sink)
      request.signal.addEventListener('abort', () => {
        remove()
        try {
          controller.close()
        } catch {
          // The peer closed first.
        }
      }, { once: true })
      controller.enqueue(encoder.encode(': connected\n\n'))
    },
  })
  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-store',
      connection: 'keep-alive',
      'x-accel-buffering': 'no',
    },
  })
}

/** Answer with JSON. */
function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}

/** Resolve the profile directory the configuration document lives in. */
function configPath(host: DshHost): string {
  return join(profileDir(host), 'dsh-notify.json')
}

/** The predecessor plugin's document, read once on first run. */
function legacyConfigPath(host: DshHost): string {
  return join(profileDir(host), 'push-notify-config.json')
}

/** The profile directory: explicit env, then the Host service, then the default. */
function profileDir(host: DshHost): string {
  return process.env.DSH_PROFILE_DIR ?? host.profileContext?.dir ?? join(homedir(), '.dsh', 'profiles', 'web')
}
