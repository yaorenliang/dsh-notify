/**
 * The Bark channel: one HTTP POST per event, no queue, no retry.
 *
 * Bark is a convenience channel; a dropped push is a missed notification, not a
 * lost fact. Retrying would duplicate cards after a flaky network, so failures
 * only surface in the settings page status line and the Host log.
 */
import type { NotificationEvent } from '../core/events.ts'
import type { NotifyConfig } from '../core/config.ts'

/** What one push attempt produced. */
export type BarkResult = { readonly ok: true } | { readonly ok: false; readonly reason: string }

/** The subset of `fetch` this channel needs; injected so tests need no server. */
export type Fetcher = (input: string, init: RequestInit) => Promise<Pick<Response, 'ok' | 'status' | 'text'>>

/** The body Bark accepts on `POST /push`. */
export interface BarkPayload {
  readonly device_key: string
  readonly title: string
  readonly body: string
  readonly group: string
  readonly sound?: string
  readonly url?: string
}

/** Build the payload for one event, omitting empty optional fields. */
export function barkPayload(config: NotifyConfig, event: NotificationEvent, title: string): BarkPayload {
  const sound = config.events[event.kind].barkSound.trim()
  const link = deepLink(config.bark.baseUrl, event.sessionId)
  return {
    device_key: config.bark.deviceKey.trim(),
    title,
    body: event.body,
    group: config.bark.group.trim(),
    ...(sound.length > 0 && sound !== 'system' ? { sound } : {}),
    ...(link !== null ? { url: link } : {}),
  }
}

/**
 * Push one event to Bark.
 *
 * @param config - the live configuration; the caller has already decided the channel is enabled.
 * @param event - the classified event.
 * @param title - the final title, composed by the caller.
 * @param fetcher - the transport; defaults to the global `fetch`.
 * @param timeoutMs - abort budget for one attempt.
 */
export async function pushBark(
  config: NotifyConfig,
  event: NotificationEvent,
  title: string,
  fetcher: Fetcher = globalThis.fetch as Fetcher,
  timeoutMs = 10_000,
): Promise<BarkResult> {
  if (config.bark.deviceKey.trim().length === 0) return { ok: false, reason: 'Bark device key is not configured' }

  const endpoint = `${config.bark.serverUrl.replace(/\/+$/, '')}/push`
  try {
    const response = await fetcher(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify(barkPayload(config, event, title)),
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!response.ok) {
      // The response body is deliberately not quoted: a misconfigured server can
      // echo the request (and the device key) back into the log.
      return { ok: false, reason: `Bark answered HTTP ${response.status}` }
    }
    return { ok: true }
  } catch (error) {
    return { ok: false, reason: `Bark request failed: ${error instanceof Error ? error.message : String(error)}` }
  }
}

/** Join the configured deep-link root and a session id; null when unconfigured. */
export function deepLink(baseUrl: string, sessionId: string): string | null {
  const root = baseUrl.trim()
  if (root.length === 0) return null
  const url = new URL(root)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
  url.searchParams.set('session', sessionId)
  return url.toString()
}
