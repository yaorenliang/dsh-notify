/**
 * The live channel: one EventSource on the Host stream.
 *
 * EventSource reconnects on its own with a Last-Event-ID this stream never sets,
 * which is exactly right: a notification is a moment, not a ledger, and replaying
 * missed ones after a reload would be noise.
 */
import type { BroadcastEvent } from './api.ts'

/** Open the notification stream; the returned function closes it. */
export function subscribeNotifications(onEvent: (event: BroadcastEvent) => void, onConnect?: (connected: boolean) => void): () => void {
  const source = new EventSource('/api/dsh-notify/stream')
  source.addEventListener('open', () => onConnect?.(true))
  source.addEventListener('error', () => onConnect?.(false))
  source.addEventListener('notification', (message) => {
    const payload = (message as MessageEvent<string>).data
    try {
      const event = JSON.parse(payload) as BroadcastEvent
      if (typeof event.id === 'string' && typeof event.kind === 'string') onEvent(event)
    } catch {
      // A malformed frame is dropped rather than breaking the stream.
    }
  })
  return () => source.close()
}
