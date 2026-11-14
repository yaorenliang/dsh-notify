/**
 * The last few minutes of notifications, kept so a browser that cannot hold a
 * stream open can still collect them.
 *
 * SSE is the good path, but a page gets six connections per origin on HTTP/1.1
 * and a DSH tab already holds several. When the seventh is refused the stream
 * never opens, and the tab silently misses everything. A short poll over an
 * ordinary request fits in whatever slot those long-lived streams leave free,
 * and this is what it reads: a ring buffer with a monotonic cursor, so a client
 * says "everything after N" and never replays an old card.
 */

/** One buffered notification. */
export interface BacklogEntry {
  /** Monotonic cursor; the client echoes the last one it saw. */
  readonly seq: number
  /** The exact payload the stream would have carried. */
  readonly payload: unknown
  /** When it was recorded, for expiry. */
  readonly at: number
}

/** What a poll request gets back. */
export interface BacklogSlice {
  /** The newest cursor; a client that has none starts here. */
  readonly seq: number
  /** Payloads recorded after the client's cursor, oldest first. */
  readonly entries: readonly unknown[]
}

/** A bounded, expiring record of what was announced. */
export class Backlog {
  private items: BacklogEntry[] = []
  private nextSeq = 1

  constructor(private readonly limit = 200, private readonly ttlMs = 10 * 60_000) {}

  /** Record one payload and return its cursor. */
  record(payload: unknown, now = Date.now()): number {
    const seq = this.nextSeq
    this.nextSeq += 1
    this.items.push({ seq, payload, at: now })
    this.trim(now)
    return seq
  }

  /** The newest cursor, without consuming anything. */
  get cursor(): number {
    return this.nextSeq - 1
  }

  /** Everything after `after`, or just the cursor when the client is new. */
  since(after: number | null, now = Date.now()): BacklogSlice {
    this.trim(now)
    if (after === null) return { seq: this.cursor, entries: [] }
    return { seq: this.cursor, entries: this.items.filter((item) => item.seq > after).map((item) => item.payload) }
  }

  /** Drop what is too old or beyond the ceiling. */
  private trim(now: number): void {
    const cutoff = now - this.ttlMs
    while (this.items.length > 0) {
      const oldest = this.items[0] as BacklogEntry
      if (oldest.at >= cutoff && this.items.length <= this.limit) break
      this.items.shift()
    }
  }
}
