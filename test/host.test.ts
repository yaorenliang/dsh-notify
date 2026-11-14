import { describe, expect, it } from 'vitest'
import { barkPayload, deepLink, pushBark, type Fetcher } from '../src/host/bark.ts'
import { SseHub, encodeFrame, type SseSink } from '../src/host/sse.ts'
import { DEFAULT_CONFIG, mergeConfig } from '../src/core/config.ts'
import type { NotificationEvent } from '../src/core/events.ts'

const at = 1_700_000_000_000
const event: NotificationEvent = {
  id: 'turn-3', kind: 'completed', sessionId: 'session-7', sessionTitle: 'Fix the build', body: 'Done', at,
}

function configure(patch: Record<string, unknown>) {
  return mergeConfig(DEFAULT_CONFIG, patch)
}

describe('barkPayload', () => {
  it('carries the device key, group, and body', () => {
    const cfg = configure({ bark: { enabled: true, deviceKey: 'key-123', group: 'DSH' } })
    expect(barkPayload(cfg, event, 'Done')).toEqual({
      device_key: 'key-123', title: 'Done', body: 'Done', group: 'DSH',
    })
  })

  it('omits the default sound and an unset link', () => {
    const cfg = configure({ bark: { enabled: true, deviceKey: 'key-123' } })
    const payload = barkPayload(cfg, event, 'Done')
    expect(payload).not.toHaveProperty('sound')
    expect(payload).not.toHaveProperty('url')
  })

  it('passes a per-kind Bark sound and the configured link root', () => {
    const cfg = configure({
      bark: { enabled: true, deviceKey: 'key-123', baseUrl: 'http://127.0.0.1:3080/' },
      events: { failed: { barkSound: 'alarm' } },
    })
    const failed = { ...event, kind: 'failed' as const }
    const payload = barkPayload(cfg, failed, 'Failed')
    expect(payload.sound).toBe('alarm')
    expect(payload.url).toBe('http://127.0.0.1:3080/?session=session-7')
  })
})

describe('deepLink', () => {
  it('returns null without a root', () => {
    expect(deepLink('  ', 's1')).toBeNull()
  })

  it('preserves an existing query and adds the session', () => {
    expect(deepLink('https://host/ui?x=1', 's 1')).toBe('https://host/ui?x=1&session=s+1')
  })
})

describe('pushBark', () => {
  const cfg = configure({ bark: { enabled: true, deviceKey: 'key-123' } })

  it('posts the payload and reports success', async () => {
    const calls: Array<{ url: string; body: unknown }> = []
    const fetcher: Fetcher = async (url, init) => {
      calls.push({ url, body: JSON.parse(String(init.body)) })
      return { ok: true, status: 200, text: async () => '' }
    }
    await expect(pushBark(cfg, event, 'Done', fetcher)).resolves.toEqual({ ok: true })
    expect(calls[0]?.url).toBe('https://api.day.app/push')
    expect(calls[0]?.body).toMatchObject({ device_key: 'key-123', title: 'Done' })
  })

  it('refuses to call out without a device key', async () => {
    const unset = configure({})
    const fetcher: Fetcher = async () => { throw new Error('must not be called') }
    await expect(pushBark(unset, event, 'Done', fetcher)).resolves.toEqual({ ok: false, reason: 'Bark device key is not configured' })
  })

  it('reports an http failure with its status and body', async () => {
    const fetcher: Fetcher = async () => ({ ok: false, status: 400, text: async () => 'bad key' })
    await expect(pushBark(cfg, event, 'Done', fetcher)).resolves.toEqual({ ok: false, reason: 'Bark answered HTTP 400' })
  })

  it('reports a transport failure instead of throwing', async () => {
    const fetcher: Fetcher = async () => { throw new Error('offline') }
    await expect(pushBark(cfg, event, 'Done', fetcher)).resolves.toEqual({ ok: false, reason: 'Bark request failed: offline' })
  })
})

describe('encodeFrame', () => {
  it('writes one event/data frame with multiline data', () => {
    expect(encodeFrame({ event: 'notification', data: 'a\nb' })).toBe('event: notification\ndata: a\ndata: b\n\n')
  })
})

describe('SseHub', () => {
  function sink(): SseSink & { frames: string[]; closed: boolean; close(): void } {
    let closeListener: (() => void) | null = null
    return {
      frames: [], closed: false,
      write(frame) { this.frames.push(frame) },
      onClose(listener) { closeListener = listener },
      close() { this.closed = true; closeListener?.() },
    }
  }

  it('fans one frame out to every subscriber', () => {
    const hub = new SseHub()
    const a = sink(); const b = sink()
    hub.add(a); hub.add(b)
    hub.broadcast({ event: 'notification', data: '{"id":1}' })
    expect(a.frames).toEqual(['event: notification\ndata: {"id":1}\n\n'])
    expect(b.frames).toHaveLength(1)
    expect(hub.size).toBe(2)
  })

  it('drops a subscriber when its peer closes', () => {
    const hub = new SseHub()
    const a = sink()
    hub.add(a)
    a.close()
    expect(hub.size).toBe(0)
  })

  it('drops a subscriber whose write throws', () => {
    const hub = new SseHub()
    const broken: SseSink = { write() { throw new Error('gone') }, onClose() {} }
    hub.add(broken)
    hub.broadcast({ event: 'notification', data: '{}' })
    expect(hub.size).toBe(0)
  })

  it('heartbeats as an sse comment', () => {
    const hub = new SseHub()
    const a = sink()
    hub.add(a)
    hub.heartbeat()
    expect(a.frames).toEqual([': ping\n\n'])
  })
})
