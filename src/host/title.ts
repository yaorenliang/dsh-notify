/**
 * How one event is titled on both channels.
 *
 * The title carries the kind and the session, in that order, and nothing else: a
 * lock screen has room for one line, and that line should answer "which
 * conversation, and what happened".
 */
import type { NotificationKind } from '../core/events.ts'

/** A short marker per kind; the emoji is the fastest read on a lock screen. */
const MARKERS: Readonly<Record<NotificationKind, string>> = {
  completed: '✅',
  failed: '❌',
  interrupted: '⏹️',
  approval: '⚠️',
  question: '❓',
}

/** Compose `marker session-title`. */
export function composeTitle(kind: NotificationKind, sessionTitle: string): string {
  const title = sessionTitle.trim().length > 0 ? sessionTitle.trim() : 'DeepSeek Harness'
  return `${MARKERS[kind]} ${title}`
}
