/**
 * The browser's view of the Host: configuration, live event stream, presence
 * reports, and the channel test. Every call rides Connection's authenticated
 * `/api` fence, so the Host needs no token of its own.
 */
import type { PublicConfig } from '../core/config.ts'
import type { NotificationEvent, NotificationKind } from '../core/events.ts'

/** One event as the Host broadcasts it: the notification plus its final title. */
export interface BroadcastEvent extends NotificationEvent {
  /** Title composed by the Host: a status mark plus the session name. */
  readonly title: string
}

/** What one channel test produced. */
export interface TestResult {
  readonly ok: boolean
  readonly channel: 'browser' | 'bark'
  readonly result?: { readonly ok: boolean; readonly reason?: string }
}

/** What one audition asks the Host for. */
export interface Audition {
  readonly channel: 'browser' | 'bark'
  /** Which kind's sound to try, so the row's own preference is what is heard. */
  readonly kind?: NotificationKind
  /** The phone sound to carry; omit to use the stored one. */
  readonly sound?: string
}

/** Read the current (redacted) configuration. */
export async function readConfig(): Promise<PublicConfig> {
  const response = await fetch('/api/dsh-notify/config', { headers: { accept: 'application/json' } })
  const body = (await response.json()) as { ok: boolean; config: PublicConfig }
  return body.config
}

/** Persist a patch and return the stored configuration. */
export async function writeConfig(patch: unknown): Promise<PublicConfig> {
  const response = await fetch('/api/dsh-notify/config', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(patch),
  })
  const body = (await response.json()) as { ok: boolean; config: PublicConfig }
  return body.config
}

/** Fire one test notification at a channel. */
export async function testChannel(audition: Audition): Promise<TestResult> {
  const response = await fetch('/api/dsh-notify/test', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(audition),
  })
  return (await response.json()) as TestResult
}

/** What one poll of the event backlog returned. */
export interface EventPage {
  /** The Host's newest cursor. */
  readonly seq: number
  /** Events recorded after the cursor this call carried. */
  readonly events: readonly BroadcastEvent[]
}

/**
 * Collect buffered notifications instead of holding a stream open.
 *
 * A page gets six connections per origin on HTTP/1.1 and a DSH tab already uses
 * several, so the seventh — the event stream — may never open at all. This rides
 * an ordinary request instead. A null cursor asks only where to start.
 */
export async function readEvents(after: number | null): Promise<EventPage> {
  const query = after === null ? '' : `?after=${after}`
  const response = await fetch(`/api/dsh-notify/events${query}`, { headers: { accept: 'application/json' } })
  const body = (await response.json()) as { ok: boolean; seq: number; events?: readonly BroadcastEvent[] }
  return { seq: body.seq, events: body.events ?? [] }
}

/**
 * Report what the person is looking at, so the Host can stay quiet for the
 * session on screen. Failures are ignored: presence is an optimisation, never
 * a requirement.
 */
export async function reportPresence(presence: { clientId: string; visible: boolean; focused: boolean; sessionId: string | null }): Promise<void> {
  try {
    await fetch('/api/dsh-notify/presence', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(presence),
    })
  } catch {
    // The next report retries.
  }
}