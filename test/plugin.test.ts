import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { apply } from '../src/host/index.ts'

/** A fake Host that records what the plugin registers. */
interface FakeHost {
  listeners: Map<string, (...args: unknown[]) => unknown>
  routes: Map<string, { path: string; methods: readonly string[]; requestBody: string; fetch: (request: Request) => Promise<Response> }>
  apply: () => void
}

function fakeHost(dir: string): FakeHost {
  const listeners = new Map<string, (...args: unknown[]) => unknown>()
  const routes = new Map<string, { path: string; methods: readonly string[]; requestBody: string; fetch: (request: Request) => Promise<Response> }>()
  const teardown: Array<() => void> = []
  const ctx = {
    on: (name: string, listener: (...args: unknown[]) => unknown) => {
      listeners.set(name, listener)
    },
    effect: (disposer: () => (() => void) | void) => {
      const off = disposer()
      if (typeof off === 'function') teardown.push(off)
    },
    logger: { warn: () => {} },
    // Cordis refuses a plain property read for an uninjected service; the fake
    // Host mirrors that rule so the plugin cannot regress into it.
    get: (name: string) => {
      if (name === 'profileContext') return { dir }
      if (name === 'sessionTitle') return { get: () => ({ title: 'Fix the build' }) }
      throw new Error(`cannot get property "${name}" without inject`)
    },
    connection: {
      fetch: {
        register: (route: { path: string }) => {
          routes.set(route.path, route as never)
          return Promise.resolve(() => {})
        },
      },
    },
  }
  return {
    listeners,
    routes,
    apply: () => apply(ctx as never),
  }
}

/** The JSON payload of one SSE frame. */
function framePayload(frame: string): string {
  const line = frame.split('\n').find((entry) => entry.startsWith('data: '))
  return line === undefined ? '{}' : line.slice('data: '.length)
}

/** A session stub with the fields the plugin reads. */
function session(id = 'session-1', subagent = false) {
  return { id, header: subagent ? { origin: 'subagent', delegationDepth: 1 } : { delegationDepth: 0 } }
}

/** Read one SSE frame at a time from a stream response, without closing it. */
function frameReader(response: Response): { next(): Promise<string>; close(): void } {
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  return {
    async next() {
      while (!buffer.includes('\n\n')) {
        const { value, done } = await reader.read()
        if (done === true) return buffer
        buffer += decoder.decode(value, { stream: true })
      }
      const end = buffer.indexOf('\n\n') + 2
      const frame = buffer.slice(0, end)
      buffer = buffer.slice(end)
      return frame
    },
    close() {
      void reader.cancel()
    },
  }
}

describe('plugin wiring', () => {
  let dir: string
  let host: FakeHost

  const previousProfile = process.env.DSH_PROFILE_DIR

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'dsh-notify-plugin-'))
    // Pin the profile so a developer's real configuration cannot leak into a test.
    process.env.DSH_PROFILE_DIR = dir
    host = fakeHost(dir)
    host.apply()
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
    if (previousProfile === undefined) delete process.env.DSH_PROFILE_DIR
    else process.env.DSH_PROFILE_DIR = previousProfile
    vi.useRealTimers()
  })

  it('registers the six authenticated routes', () => {
    expect([...host.routes.keys()].sort()).toEqual([
      '/api/dsh-notify/config',
      '/api/dsh-notify/events',
      '/api/dsh-notify/presence',
      '/api/dsh-notify/state',
      '/api/dsh-notify/stream',
      '/api/dsh-notify/test',
    ])
  })

  it('serves the redacted configuration and writes a patch', async () => {
    const configRoute = host.routes.get('/api/dsh-notify/config')!
    const initial = await (await configRoute.fetch(new Request('http://x/api/dsh-notify/config'))).json() as { config: { bark: { deviceKey: { configured: boolean } } } }
    expect(initial.config.bark.deviceKey.configured).toBe(false)

    const saved = await (await configRoute.fetch(new Request('http://x/api/dsh-notify/config', {
      method: 'POST',
      body: JSON.stringify({ bark: { enabled: true, deviceKey: 'secret-key-5678' } }),
    }))).json() as { config: { bark: { deviceKey: { configured: boolean; masked: string } } } }
    expect(saved.config.bark.deviceKey).toEqual({ configured: true, masked: '••••••••5678' })
    expect(readFileSync(join(dir, 'dsh-notify.json'), 'utf8')).toContain('secret-key-5678')
  })

  it('streams a completed turn to an attached browser', async () => {
    const stream = host.routes.get('/api/dsh-notify/stream')!
    const response = await stream.fetch(new Request('http://x/api/dsh-notify/stream'))
    expect(response.headers.get('content-type')).toContain('text/event-stream')

    // Enable the browser channel first.
    await host.routes.get('/api/dsh-notify/config')!.fetch(new Request('http://x/api/dsh-notify/config', {
      method: 'POST',
      body: JSON.stringify({ browser: { enabled: true } }),
    }))

    const frames = frameReader(response)
    expect(await frames.next()).toContain(': connected')
    const onEvent = host.listeners.get('session/event')!
    const target = session()
    onEvent(target, { type: 'assistant/message', data: { message: { content: [{ type: 'text', text: 'All green.' }] } } })
    onEvent(target, { type: 'turn/end', data: { turn: 1, reason: { kind: 'completed' } } })

    // The completion waits out its settle window before it is announced.
    const event = await frames.next()
    frames.close()
    expect(event).toContain('"body":"All green."')
  })

  it('never announces an unknown ending', async () => {
    const stream = host.routes.get('/api/dsh-notify/stream')!
    const response = await stream.fetch(new Request('http://x/api/dsh-notify/stream'))
    await host.routes.get('/api/dsh-notify/config')!.fetch(new Request('http://x/api/dsh-notify/config', {
      method: 'POST',
      body: JSON.stringify({ browser: { enabled: true } }),
    }))
    const frames = frameReader(response)
    await frames.next()
    host.listeners.get('session/event')!(session('s2'), { type: 'turn/end', data: { turn: 4, reason: { kind: 'max-tokens' } } })
    const raced = await Promise.race([frames.next(), new Promise<string>((resolve) => setTimeout(() => resolve('timeout'), 100))])
    frames.close()
    expect(raced).toBe('timeout')
  })

  it('leads the body with what the person asked', async () => {
    const stream = host.routes.get('/api/dsh-notify/stream')!
    const response = await stream.fetch(new Request('http://x/api/dsh-notify/stream'))
    await host.routes.get('/api/dsh-notify/config')!.fetch(new Request('http://x/api/dsh-notify/config', {
      method: 'POST',
      body: JSON.stringify({ browser: { enabled: true, currentSessionMode: 'always' } }),
    }))
    const frames = frameReader(response)
    await frames.next()
    const onEvent = host.listeners.get('session/event')!
    const target = session('s-prompt')
    onEvent(target, { type: 'turn/start', data: { turn: 1 } })
    onEvent(target, {
      type: 'user/message',
      data: { role: 'user', source: { kind: 'user' }, content: [{ type: 'text', text: 'Fix the build' }] },
    })
    onEvent(target, { type: 'assistant/message', data: { message: { content: [{ type: 'text', text: 'All green.' }] } } })
    onEvent(target, { type: 'turn/end', data: { turn: 1, reason: { kind: 'completed' } } })

    const event = JSON.parse(framePayload(await frames.next()))
    frames.close()
    expect(event.body).toBe('Fix the build')
    expect(event.title).toBe('✅ Fix the build')
  })

  it('treats injected context as no prompt at all', async () => {
    const stream = host.routes.get('/api/dsh-notify/stream')!
    const response = await stream.fetch(new Request('http://x/api/dsh-notify/stream'))
    await host.routes.get('/api/dsh-notify/config')!.fetch(new Request('http://x/api/dsh-notify/config', {
      method: 'POST',
      body: JSON.stringify({ browser: { enabled: true, currentSessionMode: 'always' } }),
    }))
    const frames = frameReader(response)
    await frames.next()
    const onEvent = host.listeners.get('session/event')!
    const target = session('s-injected')
    onEvent(target, { type: 'turn/start', data: { turn: 1 } })
    onEvent(target, {
      type: 'user/message',
      data: { role: 'user', source: { kind: 'cron' }, content: [{ type: 'text', text: 'Daily maintenance' }] },
    })
    onEvent(target, { type: 'assistant/message', data: { message: { content: [{ type: 'text', text: 'All clean.' }] } } })
    onEvent(target, { type: 'turn/end', data: { turn: 1, reason: { kind: 'completed' } } })

    const event = JSON.parse(framePayload(await frames.next()))
    frames.close()
    expect(event.body).toBe('All clean.')
  })

  it('cancels a completion that is followed by another turn', async () => {
    const stream = host.routes.get('/api/dsh-notify/stream')!
    const response = await stream.fetch(new Request('http://x/api/dsh-notify/stream'))
    await host.routes.get('/api/dsh-notify/config')!.fetch(new Request('http://x/api/dsh-notify/config', {
      method: 'POST',
      body: JSON.stringify({ browser: { enabled: true } }),
    }))
    const frames = frameReader(response)
    await frames.next()
    const onEvent = host.listeners.get('session/event')!
    const target = session('s3')
    onEvent(target, { type: 'turn/end', data: { turn: 1, reason: { kind: 'completed' } } })
    onEvent(target, { type: 'turn/start', data: { turn: 2 } })
    const raced = await Promise.race([frames.next(), new Promise<string>((resolve) => setTimeout(() => resolve('timeout'), 1200))])
    frames.close()
    expect(raced).toBe('timeout')
  })

  it('always continues the approval waterfall', async () => {
    const listener = host.listeners.get('approval/request') as (request: unknown, next: () => Promise<string>) => Promise<string>
    const answered = await listener({ agent: { session: session('s4') }, toolName: 'bash', callId: 'c1' }, async () => 'user-answer')
    expect(answered).toBe('user-answer')
  })

  it('reports presence and counts a browser in its state', async () => {
    const stream = host.routes.get('/api/dsh-notify/stream')!
    await stream.fetch(new Request('http://x/api/dsh-notify/stream'))
    await host.routes.get('/api/dsh-notify/presence')!.fetch(new Request('http://x/api/dsh-notify/presence', {
      method: 'POST',
      body: JSON.stringify({ clientId: 'tab-background', visible: true, focused: false, sessionId: 'other' }),
    }))
    await host.routes.get('/api/dsh-notify/presence')!.fetch(new Request('http://x/api/dsh-notify/presence', {
      method: 'POST',
      body: JSON.stringify({ clientId: 'tab-1', visible: true, focused: true, sessionId: null }),
    }))
    const state = await (await host.routes.get('/api/dsh-notify/state')!.fetch(new Request('http://x/api/dsh-notify/state'))).json() as {
      browsers: number
      presence: { visible: boolean } | null
    }
    expect(state.browsers).toBe(1)
    expect(state.presence?.visible).toBe(true)
  })
})
