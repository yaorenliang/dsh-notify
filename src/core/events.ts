/**
 * The notification vocabulary shared by the Host and the browser.
 *
 * One logical happening is one {@link NotificationEvent}: the Host decides it,
 * the Bark channel pushes it, and the SSE channel hands the same value to every
 * connected browser. Nothing in this module touches the Host, the DOM, or a
 * clock it cannot be given, so it runs unchanged under vitest.
 */

/** The five things worth interrupting a person for. */
export type NotificationKind =
  /** A turn ended because the agent finished its answer. */
  | 'completed'
  /** A turn ended because the model call or a tool failed. */
  | 'failed'
  /** A turn was cancelled or interrupted before it finished. */
  | 'interrupted'
  /** A tool is waiting for the user's permission. */
  | 'approval'
  /** The agent asked the user a question. */
  | 'question'

/** One classified notification, ready for every channel. */
export interface NotificationEvent {
  /** Stable identity; the dispatcher collapses repeated ids. */
  readonly id: string
  readonly kind: NotificationKind
  /** Session the event belongs to; the browser opens it on click. */
  readonly sessionId: string
  /** Human display title of that session. */
  readonly sessionTitle: string
  /** Body text for the system notification and the push. */
  readonly body: string
  /** Optional machine detail: tool name, error code, question options. */
  readonly detail?: string
  /** Event time in epoch milliseconds. */
  readonly at: number
  /** Turn number, for turn-scoped kinds. */
  readonly turn?: number
}

/** The durable session facts one classification reads. */
export interface SessionFacts {
  readonly id: string
  readonly title: string
  /** True when this session was spawned by another session. */
  readonly subagent: boolean
  /** Running descendant count, when the Host can see the fan-out. */
  readonly runningDescendants: number
  /** True when the Host already holds work that will start another turn. */
  readonly hasQueuedWork: boolean
}

/** The reason shape `turn/end` carries, narrowed to the fields read here. */
export interface TurnEndReasonLike {
  readonly kind?: string
  readonly error?: { readonly code?: string; readonly message?: string } | null
  readonly reason?: unknown
}

/** The result of classifying one `turn/end`. */
export type TurnOutcome =
  | { readonly kind: 'completed' }
  | { readonly kind: 'failed'; readonly code: string | null; readonly message: string }
  | { readonly kind: 'interrupted'; readonly reason: TurnEndReasonLike }
  /** The turn ended in a way that is not worth interrupting anyone for. */
  | { readonly kind: 'silent'; readonly why: 'blocked' | 'max-tokens' | 'forked' | 'unknown' }

const QUOTA_CODES = new Set(['QUOTA', 'ACCOUNT_QUOTA', 'INSUFFICIENT_QUOTA'])

/**
 * Classify a finished turn.
 *
 * `completed` is the only reason that means "the agent answered"; everything
 * else is an interruption of some sort, and an error carries the reason a
 * person needs to decide whether to come back.
 */
export function classifyTurnEnd(reason: TurnEndReasonLike | null | undefined): TurnOutcome {
  // Only a reason the plugin actually understands becomes a notification: an
  // unknown ending must stay silent rather than claim the agent answered.
  if (reason === null || reason === undefined || typeof reason.kind !== 'string') {
    return { kind: 'silent', why: 'unknown' }
  }
  switch (reason.kind) {
    case 'completed':
      return { kind: 'completed' }
    case 'error': {
      const code = reason.error?.code ?? null
      const raw = reason.error?.message?.trim()
      return { kind: 'failed', code, message: raw !== undefined && raw.length > 0 ? raw : '' }
    }
    case 'aborted':
    case 'interrupted':
      return { kind: 'interrupted', reason }
    case 'blocked':
    case 'max-tokens':
    case 'forked':
      return { kind: 'silent', why: reason.kind }
    default:
      return { kind: 'silent', why: 'unknown' }
  }
}

/** Whether an abort payload names the signed-out hook. */
export function isSignedOutAbort(reason: TurnEndReasonLike): boolean {
  const nested = reason.reason
  return isRecord(nested) && nested.kind === 'hook' && nested.reason === 'deepseek-account/signed-out'
}

/** Narrow an unknown value to a plain record. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Cap a notification body. A user message or an error can be a whole paragraph;
 * both the OS card and the push payload read better cut at a sentence boundary.
 */
export function truncate(text: string, max = 220): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  if (flat.length <= max) return flat
  const cut = flat.slice(0, max)
  const stop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('。'), cut.lastIndexOf('! '), cut.lastIndexOf('? '))
  return stop > max * 0.6 ? cut.slice(0, stop + 1) : `${cut.trimEnd()}…`
}
