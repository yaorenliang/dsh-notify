/**
 * The browser channel's transport: one Server-Sent Events hub.
 *
 * A subscriber is any sink that can take a string and be told when the peer is
 * gone. The Hub owns fan-out, heartbeats, and backpressure-free writes; the Host
 * half adapts it to a `/api` streaming route, and tests drive it directly.
 */

/** One connected browser's SSE sink. */
export interface SseSink {
  /** Write one already-encoded frame. Must be synchronous and non-throwing. */
  write(frame: string): void
  /** Register the peer-gone callback. */
  onClose(listener: () => void): void
}

/** The encoder an SSE frame needs; kept separate so the Hub stays transport-free. */
export interface SseFrame {
  readonly event: string
  readonly data: string
}

/** Encode one frame in the wire format. */
export function encodeFrame(frame: SseFrame): string {
  return `event: ${frame.event}\ndata: ${frame.data.replace(/\n/g, '\ndata: ')}\n\n`
}

/** Broadcast fan-out with a heartbeat that keeps idle proxies from closing. */
export class SseHub {
  private readonly sinks = new Set<SseSink>()

  /** Add one subscriber; the returned function removes it. */
  add(sink: SseSink): () => void {
    this.sinks.add(sink)
    let closed = false
    const remove = (): void => {
      if (closed) return
      closed = true
      this.sinks.delete(sink)
    }
    sink.onClose(remove)
    return remove
  }

  /** Send one frame to every subscriber. */
  broadcast(frame: SseFrame): void {
    const encoded = encodeFrame(frame)
    for (const sink of this.sinks) {
      try {
        sink.write(encoded)
      } catch {
        this.sinks.delete(sink)
      }
    }
  }

  /** Send a comment frame so idle connections stay open. */
  heartbeat(): void {
    for (const sink of this.sinks) {
      try {
        sink.write(': ping\n\n')
      } catch {
        this.sinks.delete(sink)
      }
    }
  }

  /** How many browsers are currently attached. */
  get size(): number {
    return this.sinks.size
  }
}
