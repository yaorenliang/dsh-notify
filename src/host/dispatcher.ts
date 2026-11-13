/**
 * The single dispatch point: one classified event, at most one card per channel.
 *
 * The dispatcher owns the three things that must not be duplicated per listener:
 * collapsing repeats, applying the delivery policy, and choosing which channels
 * are live. Listeners upstream only classify.
 */
import type { NotificationEvent } from '../core/events.ts'
import type { NotifyConfig } from '../core/config.ts'
import { collapseKey, decideDelivery, type DeliveryPolicy, type PolicyFacts, type Presence } from '../core/policy.ts'
import { composeTitle } from './title.ts'
import type { BarkResult } from './bark.ts'

/** What dispatch produced, for logs and the settings status line. */
export interface DispatchOutcome {
  readonly delivered: boolean
  /** Why nothing was sent, when nothing was. */
  readonly suppressed?: 'duplicate' | 'subagent' | 'current-session' | 'no-channel' | 'rate-limit'
  readonly channels: readonly ('browser' | 'bark')[]
}

/** Everything the dispatcher needs from its environment. */
export interface DispatchPorts {
  /** The live configuration. */
  readonly config: () => NotifyConfig
  /** The latest browser presence report, or null when nobody reported. */
  readonly presence: () => Presence | null
  /** Show one system notification in every attached browser. */
  readonly browser: (event: NotificationEvent, title: string) => void
  /** Push one event to the phone. */
  readonly bark: (event: NotificationEvent, title: string) => Promise<BarkResult>
  /** Host log sink. */
  readonly log?: (message: string) => void
  /** Clock, injected for tests. */
  readonly now?: () => number
}

/** How long a collapsed event id is remembered, in milliseconds. */
const DEDUPE_TTL_MS = 30_000

/** Burst guards: a runaway loop must not turn into a notification storm. */
const RATE = { sessionPerMinute: 6, globalPerMinute: 20 } as const

/** The dispatcher: dedupe, policy, fan-out. */
export class Dispatcher {
  private readonly seen = new Map<string, number>()
  private readonly globalSends: number[] = []
  private readonly sessionSends = new Map<string, number[]>()
  private readonly ports: DispatchPorts

  constructor(ports: DispatchPorts) {
    this.ports = ports
  }

  /**
   * Dispatch one event.
   *
   * @param event - the classified event; its id must be stable per happening.
   * @param facts - session facts the policy reads.
   */
  dispatch(event: NotificationEvent, facts: PolicyFacts): DispatchOutcome {
    const now = (this.ports.now ?? Date.now)()
    this.prune(now)

    const key = collapseKey(event)
    if (this.seen.has(key)) return { delivered: false, suppressed: 'duplicate', channels: [] }
    this.seen.set(key, now)

    const config = this.ports.config()
    const policy: DeliveryPolicy = {
      currentSessionMode: config.browser.currentSessionMode,
      notifySubagents: config.notifySubagents,
      presenceTtlMs: 45_000,
    }
    const decision = decideDelivery(event, facts, this.ports.presence(), policy, now)
    if (!decision.deliver) {
      return { delivered: false, suppressed: decision.suppression ?? 'current-session', channels: [] }
    }

    if (!this.withinRate(event.sessionId, now)) {
      return { delivered: false, suppressed: 'rate-limit', channels: [] }
    }

    const title = composeTitle(config.prefix, event.kind, event.sessionTitle)
    const channels: ('browser' | 'bark')[] = []
    if (config.browser.enabled) {
      this.ports.browser(event, title)
      channels.push('browser')
    }
    if (config.bark.enabled && config.bark.deviceKey.trim().length > 0) {
      channels.push('bark')
    }
    if (channels.length === 0) return { delivered: false, suppressed: 'no-channel', channels: [] }

    if (channels.includes('bark')) {
      void this.ports.bark(event, title).then((result) => {
        if (!result.ok) this.ports.log?.(`dsh-notify: ${result.reason}`)
      })
    }
    return { delivered: true, channels }
  }

  /** Whether this session and the process are both under their burst ceiling. */
  private withinRate(sessionId: string, now: number): boolean {
    const window = now - 60_000
    while (this.globalSends.length > 0 && this.globalSends[0]! < window) this.globalSends.shift()
    const perSession = this.sessionSends.get(sessionId) ?? []
    while (perSession.length > 0 && perSession[0]! < window) perSession.shift()
    if (this.globalSends.length >= RATE.globalPerMinute || perSession.length >= RATE.sessionPerMinute) {
      this.sessionSends.set(sessionId, perSession)
      return false
    }
    this.globalSends.push(now)
    perSession.push(now)
    this.sessionSends.set(sessionId, perSession)
    return true
  }

  /** Forget ids older than the collapse window. */
  private prune(now: number): void {
    if (this.seen.size < 256) return
    for (const [key, at] of this.seen) {
      if (now - at > DEDUPE_TTL_MS) this.seen.delete(key)
    }
  }
}
