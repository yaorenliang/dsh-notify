/**
 * Delivery policy: the single place that decides whether a classified event is
 * worth interrupting anyone.
 *
 * Both channels run through this, so the phone and the browser never disagree
 * about whether something is noise. The only browser-specific input is
 * {@link Presence}, which the browser half reports to the Host.
 */
import type { NotificationEvent } from './events.ts'

/** When the session currently on screen may still alert. */
export type CurrentSessionMode =
  /** Only while the tab is backgrounded or the window is minimised. */
  | 'hidden'
  /** Also when another application is in front of a visible tab. */
  | 'unfocused'
  /** Always, even while the person is reading that session. */
  | 'always'

/** What the browser last told the Host about the person's attention. */
export interface Presence {
  /** Document visibility at report time. */
  readonly visible: boolean
  /** Document focus at report time; false while another app is in front. */
  readonly focused: boolean
  /** Session open in the main view, when one is. */
  readonly sessionId: string | null
  /** Report time in epoch milliseconds. */
  readonly at: number
}

/** The policy knobs a delivery decision reads. */
export interface DeliveryPolicy {
  readonly currentSessionMode: CurrentSessionMode
  /** Whether sessions spawned by another session may alert at all. */
  readonly notifySubagents: boolean
  /** How long a presence report stays authoritative. */
  readonly presenceTtlMs: number
}

/** Defaults that keep a person at the keyboard undisturbed. */
export const DEFAULT_POLICY: DeliveryPolicy = Object.freeze({
  currentSessionMode: 'hidden',
  notifySubagents: false,
  presenceTtlMs: 45_000,
})

/** Why an event was not delivered; kept for logs and settings diagnostics. */
export type Suppression = 'subagent' | 'current-session'

/** The decision plus the reason, so a suppression is explainable. */
export type DeliveryDecision =
  | { readonly deliver: true }
  | { readonly deliver: false; readonly suppression: Suppression }

/** The facts about an event's session that policy reads. */
export interface PolicyFacts {
  readonly subagent: boolean
}

/**
 * Decide whether one event reaches the channels.
 *
 * A stale presence report is treated as "nobody is looking", which errs toward
 * delivering: a missed approval costs more than one extra card.
 */
export function decideDelivery(
  event: NotificationEvent,
  facts: PolicyFacts,
  presence: Presence | null,
  policy: DeliveryPolicy = DEFAULT_POLICY,
  now: number = Date.now(),
): DeliveryDecision {
  if (facts.subagent && !policy.notifySubagents) {
    return { deliver: false, suppression: 'subagent' }
  }
  const fresh = presence !== null && now - presence.at <= policy.presenceTtlMs
  // A report from another session says nothing about this one; an unknown
  // session id (the browser cannot always tell) still counts as "here".
  const watching = fresh && (presence.sessionId === null || presence.sessionId === event.sessionId)
  if (watching && policy.currentSessionMode !== 'always') {
    if (policy.currentSessionMode === 'hidden' && !presence.visible) {
      return { deliver: true }
    }
    if (policy.currentSessionMode === 'unfocused' && !(presence.visible && presence.focused)) {
      return { deliver: true }
    }
    return { deliver: false, suppression: 'current-session' }
  }
  return { deliver: true }
}

/**
 * The key that collapses repeats of one happening.
 *
 * A replacement approval or a retried question carries a new id, so a genuinely
 * new interaction still alerts; the same id twice does not.
 */
export function collapseKey(event: NotificationEvent): string {
  return `${event.kind}:${event.id}`
}
