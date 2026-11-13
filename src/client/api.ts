/**
 * The browser's view of the Host: configuration, live event stream, presence
 * reports, and the channel test. Every call rides Connection's authenticated
 * `/api` fence, so the Host needs no token of its own.
 */
import type { PublicConfig } from '../core/config.ts'
import type { NotificationEvent } from '../core/events.ts'

/** One event as the Host broadcasts it: the notification plus its final title. */
export interface BroadcastEvent extends NotificationEvent {
  /** Title composed by the Host (prefix, marker, session title). */
  readonly title: string
  /** Present on a settings-page test push. */
  readonly test?: boolean
}

/** Host-side status shown on the settings page. */
export interface HostState {
  readonly ok: boolean
  /** Attached browser streams. */
  readonly browsers: number
  readonly channels: { readonly browser: boolean; readonly bark: boolean }
  readonly presence: { readonly visible: boolean; readonly focused: boolean; readonly sessionId: string | null; readonly at: number } | null
}

/** What one channel test produced. */
export interface TestResult {
  readonly ok: boolean
  readonly channel: 'browser' | 'bark'
  readonly browsers?: number
  readonly result?: { readonly ok: boolean; readonly reason?: string }
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

/** Read the Host status line. */
export async function readState(): Promise<HostState> {
  const response = await fetch('/api/dsh-notify/state', { headers: { accept: 'application/json' } })
  return (await response.json()) as HostState
}

/** Fire one test notification at a channel. */
export async function testChannel(channel: 'browser' | 'bark'): Promise<TestResult> {
  const response = await fetch('/api/dsh-notify/test', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ channel }),
  })
  return (await response.json()) as TestResult
}

/**
 * Report what the person is looking at, so the Host can stay quiet for the
 * session on screen. Failures are ignored: presence is an optimisation, never
 * a requirement.
 */
export async function reportPresence(presence: { visible: boolean; focused: boolean; sessionId: string | null }): Promise<void> {
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
