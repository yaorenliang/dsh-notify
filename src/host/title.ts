/**
 * How one event is titled on both channels.
 *
 * The title is the only string a person reads on a locked phone, so it carries
 * the kind and the session, in that order, and nothing else.
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

/** Compose `[prefix] marker session-title`. */
export function composeTitle(prefix: string, kind: NotificationKind, sessionTitle: string): string {
  const marker = MARKERS[kind]
  const title = sessionTitle.trim().length > 0 ? sessionTitle.trim() : 'DeepSeek Harness'
  return `${sanitizePrefix(prefix)}${marker} ${title}`
}

/** Normalise a user-typed prefix into `[text] `; empty stays empty. */
export function sanitizePrefix(prefix: string): string {
  const trimmed = prefix.trim().replace(/^\[|\]$/g, '').trim()
  return trimmed.length === 0 ? '' : `[${trimmed.slice(0, 12)}] `
}
