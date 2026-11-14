/**
 * The live channel, with a fallback for the case where no stream can open.
 *
 * SSE is the right transport: one connection, instant delivery. But a page gets
 * six connections per origin on HTTP/1.1, and a DSH tab holds several of them; if
 * the event stream is the seventh it never opens, and the tab looks healthy while
 * receiving nothing. A browser only retries a `CONNECTING` stream forever when it
 * is queued behind those sockets, and gives up entirely when a response is not
 * `text/event-stream`.
 *
 * So the stream is given a deadline. If it is not open by then — or the browser
 * closes it for good — this switches to collecting the same events from the
 * Host's backlog over ordinary requests, which fit in whatever slot is free.
 */
import { readEvents, type BroadcastEvent } from './api.ts'

/** How long the stream has to open before polling takes over. */
const STREAM_DEADLINE_MS = 8_000

/** How often the fallback asks for what it missed. */
const POLL_MS = 3_000

/** The fields a payload must carry to be worth showing. */
function isEvent(value: unknown): value is BroadcastEvent {
  const candidate = value as Partial<BroadcastEvent> | null
  return candidate !== null && typeof candidate?.id === 'string' && typeof candidate?.kind === 'string'
}

/** Open the notification channel; the returned function closes it for good. */
export function subscribeNotifications(onEvent: (event: BroadcastEvent) => void): () => void {
  let source: EventSource | null = null
  let deadline: ReturnType<typeof setTimeout> | null = null
  let pollTimer: ReturnType<typeof setTimeout> | null = null
  let cursor: number | null = null
  let disposed = false
  let polling = false

  const deliver = (value: unknown): void => {
    if (isEvent(value)) onEvent(value)
  }

  const poll = async (): Promise<void> => {
    if (disposed) return
    try {
      const page = await readEvents(cursor)
      cursor = page.seq
      for (const event of page.events) deliver(event)
    } catch {
      // The next tick tries again; a missing poll costs latency, not the event.
    }
    if (disposed) return
    pollTimer = setTimeout(() => void poll(), POLL_MS)
  }

  const fallBackToPolling = (): void => {
    if (disposed || polling) return
    polling = true
    if (deadline !== null) clearTimeout(deadline)
    source?.close()
    source = null
    void poll()
  }

  const open = (): void => {
    source = new EventSource('/api/dsh-notify/stream')
    source.addEventListener('notification', (message) => {
      const payload = (message as MessageEvent<string>).data
      try {
        deliver(JSON.parse(payload))
      } catch {
        // A malformed frame is dropped rather than breaking the channel.
      }
    })
    source.addEventListener('open', () => {
      if (deadline !== null) clearTimeout(deadline)
      deadline = null
    })
    source.addEventListener('error', () => {
      // CONNECTING means the browser is still retrying by itself. CLOSED means it
      // never will, which is what the fallback exists for.
      if (disposed || source === null || source.readyState !== EventSource.CLOSED) return
      fallBackToPolling()
    })

    if (typeof EventSource !== 'undefined') {
      deadline = setTimeout(() => {
        // Still connecting after the deadline: the request is queued behind the
        // tab's other sockets and may stay there for as long as the page lives.
        if (source !== null && source.readyState !== EventSource.OPEN) fallBackToPolling()
      }, STREAM_DEADLINE_MS)
    }
  }

  if (typeof EventSource !== 'undefined') open()
  else fallBackToPolling()

  return () => {
    disposed = true
    if (deadline !== null) clearTimeout(deadline)
    if (pollTimer !== null) clearTimeout(pollTimer)
    source?.close()
    source = null
  }
}
