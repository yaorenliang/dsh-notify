import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { subscribeNotifications } from '../src/client/stream.ts'

/**
 * A stand-in for the browser's EventSource.
 *
 * The behaviour under test is what happens when the stream cannot open or is
 * closed for good, so the fake records every stream and lets a test steer it.
 */
class FakeEventSource {
  static readonly CONNECTING = 0
  static readonly OPEN = 1
  static readonly CLOSED = 2
  static instances: FakeEventSource[] = []

  readyState = FakeEventSource.CONNECTING
  readonly listeners = new Map<string, Array<(event?: unknown) => void>>()

  constructor(readonly url: string) {
    FakeEventSource.instances.push(this)
  }

  addEventListener(type: string, handler: (event?: unknown) => void): void {
    const list = this.listeners.get(type) ?? []
    list.push(handler)
    this.listeners.set(type, list)
  }

  close(): void {
    this.readyState = FakeEventSource.CLOSED
  }

  emit(type: string, event?: unknown): void {
    for (const handler of this.listeners.get(type) ?? []) handler(event)
  }

  open(): void {
    this.readyState = FakeEventSource.OPEN
    this.emit('open')
  }

  failPermanently(): void {
    this.readyState = FakeEventSource.CLOSED
    this.emit('error')
  }
}

const frame = (id: string): string => JSON.stringify({ id, kind: 'completed', title: 't', body: 'b', sessionId: 's' })

describe('notification channel', () => {
  const replies: Array<{ seq: number; events: unknown[] }> = []

  beforeEach(() => {
    vi.useFakeTimers()
    FakeEventSource.instances = []
    replies.length = 0
    vi.stubGlobal('EventSource', FakeEventSource)
    vi.stubGlobal('fetch', vi.fn(async () => ({ json: async () => replies.shift() ?? { ok: true, seq: 0, events: [] } })))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('opens a stream and passes a well-formed notification through', () => {
    const seen: string[] = []
    const stop = subscribeNotifications((event) => seen.push(event.id))
    const source = FakeEventSource.instances[0] as FakeEventSource
    source.open()
    source.emit('notification', { data: frame('a') })

    expect(seen).toEqual(['a'])
    stop()
  })

  it('leaves a stream that is still connecting alone', () => {
    subscribeNotifications(() => {})
    const source = FakeEventSource.instances[0] as FakeEventSource
    source.emit('error')
    vi.advanceTimersByTime(4_000)

    expect(fetch).not.toHaveBeenCalled()
  })

  it('collects what it missed when the stream never opens', async () => {
    const seen: string[] = []
    replies.push({ seq: 7, events: [] })
    replies.push({ seq: 8, events: [{ id: 'nine', kind: 'completed', title: 't', body: 'b', sessionId: 's' }] })

    subscribeNotifications((event) => seen.push(event.id))
    await vi.advanceTimersByTimeAsync(8_000)
    expect(fetch).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(3_000)
    expect(seen).toEqual(['nine'])
  })

  it('collects what it missed when the browser closes the stream for good', async () => {
    const seen: string[] = []
    replies.push({ seq: 3, events: [{ id: 'four', kind: 'failed', title: 't', body: 'b', sessionId: 's' }] })

    subscribeNotifications((event) => seen.push(event.id))
    const source = FakeEventSource.instances[0] as FakeEventSource
    source.failPermanently()
    await vi.advanceTimersByTimeAsync(0)

    expect(seen).toEqual(['four'])
  })

  it('stops asking after the owner disposes of it', () => {
    const stop = subscribeNotifications(() => {})
    stop()
    vi.advanceTimersByTime(60_000)

    expect(fetch).not.toHaveBeenCalled()
  })
})
