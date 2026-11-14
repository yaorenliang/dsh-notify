import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { subscribeNotifications } from '../src/client/stream.ts'

/**
 * A stand-in for the browser object.
 *
 * The behaviour under test is what happens after a permanent close, so the fake
 * records how many streams were opened and lets a test close one on demand.
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

  /** Fire a listener of this stream. */
  emit(type: string, event?: unknown): void {
    for (const handler of this.listeners.get(type) ?? []) handler(event)
  }

  /** Pretend the browser gave up on this connection for good. */
  breakPermanently(): void {
    this.readyState = FakeEventSource.CLOSED
    this.emit('error')
  }
}

describe('notification stream', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    FakeEventSource.instances = []
    vi.stubGlobal('EventSource', FakeEventSource)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('opens one stream and passes a well-formed notification through', () => {
    const seen: string[] = []
    const stop = subscribeNotifications((event) => seen.push(event.id))
    expect(FakeEventSource.instances).toHaveLength(1)

    const source = FakeEventSource.instances[0] as FakeEventSource
    source.emit('notification', { data: JSON.stringify({ id: 'a', kind: 'completed', title: 't', body: 'b', sessionId: 's' }) })

    expect(seen).toEqual(['a'])
    stop()
  })

  it('rebuilds a stream the browser closed for good', () => {
    subscribeNotifications(() => {})
    const first = FakeEventSource.instances[0] as FakeEventSource
    first.breakPermanently()

    expect(FakeEventSource.instances).toHaveLength(1)
    vi.advanceTimersByTime(2_000)
    expect(FakeEventSource.instances).toHaveLength(2)
  })

  it('stays quiet after the owner disposes of it', () => {
    const stop = subscribeNotifications(() => {})
    const first = FakeEventSource.instances[0] as FakeEventSource
    stop()
    first.breakPermanently()

    vi.advanceTimersByTime(120_000)
    expect(FakeEventSource.instances).toHaveLength(1)
  })
})
