/**
 * The live channel: one EventSource on the Host stream.
 *
 * EventSource reconnects on its own with a Last-Event-ID this stream never sets,
 * which is exactly right: a notification is a moment, not a ledger, and replaying
 * missed ones after a reload would be noise.
 *
 * It does not reconnect after every failure, though: a response that is not
 * `text/event-stream` — a 401 from a half-restarted Host, a request the browser
 * dropped — leaves the object CLOSED for good, and the page keeps looking
 * healthy while nothing arrives. A tab left open across a restart would then
 * never hear another notification. So a permanently closed stream is rebuilt
 * here, on a widening delay.
 */
import type { BroadcastEvent } from './api.ts'

/** Delays between rebuilds of a stream the browser gave up on, in milliseconds. */
const RETRY_MS = [2_000, 5_000, 15_000, 30_000, 60_000]

/** Open the notification stream; the returned function closes it for good. */
export function subscribeNotifications(onEvent: (event: BroadcastEvent) => void): () => void {
  let source: EventSource | null = null
  let retry = 0
  let timer: ReturnType<typeof setTimeout> | null = null
  let disposed = false

  const open = (): void => {
    source = new EventSource('/api/dsh-notify/stream')
    listen(source)
  }

  const listen = (connection: EventSource): void => {
    connection.addEventListener('notification', (message) => {
      const payload = (message as MessageEvent<string>).data
      try {
        const event = JSON.parse(payload) as BroadcastEvent
        if (typeof event.id === 'string' && typeof event.kind === 'string') onEvent(event)
      } catch {
        // A malformed frame is dropped rather than breaking the stream.
      }
    })
    connection.addEventListener('error', () => {
      // CONNECTING means the browser is retrying by itself; only a CLOSED stream
      // needs a new object, and only after a pause so a downed Host is not hammered.
      if (disposed || connection.readyState !== EventSource.CLOSED) return
      connection.close()
      const wait = RETRY_MS[Math.min(retry, RETRY_MS.length - 1)] ?? RETRY_MS[0]
      retry += 1
      timer = setTimeout(() => {
        if (!disposed) open()
      }, wait)
    })
    connection.addEventListener('open', () => {
      retry = 0
    })
  }

  if (typeof EventSource !== 'undefined') open()

  return () => {
    disposed = true
    if (timer !== null) clearTimeout(timer)
    source?.close()
  }
}
