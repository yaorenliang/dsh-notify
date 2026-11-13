import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSettingsModel } from '../src/client/model.ts'

/** The stored document the fake Host answers with. */
let stored: Record<string, unknown>

/** The answer the fake Host gives to a test push. */
let testAnswer: Record<string, unknown>

/** Every request the model issued, for assertions. */
let calls: { url: string; method: string; body: unknown }[]

const state = { ok: true, browsers: 1, channels: { browser: true, bark: false }, presence: null }

function respond(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })
}

beforeEach(() => {
  stored = { locale: 'auto', bark: { group: 'DSH' } }
  testAnswer = { ok: true, channel: 'bark', result: { ok: true } }
  calls = []
  vi.stubGlobal('fetch', async (input: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET'
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined
    calls.push({ url: String(input), method, body })

    if (String(input).endsWith('/config') && method === 'GET') return respond({ ok: true, config: stored })
    if (String(input).endsWith('/config') && method === 'POST') {
      stored = { ...stored, ...(body as object) }
      return respond({ ok: true, config: stored })
    }
    if (String(input).endsWith('/state')) return respond(state)
    if (String(input).endsWith('/test')) return respond({ ...testAnswer, channel: (body as { channel: string }).channel })
    return respond({ ok: false })
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('settings model', () => {
  it('loads the configuration and the Host state', async () => {
    const model = createSettingsModel()
    const seen: boolean[] = []
    model.subscribe(() => seen.push(model.getSnapshot().busy))

    const pending = model.refresh()
    expect(model.getSnapshot().busy).toBe(true)
    await pending

    expect(model.getSnapshot().config).toEqual(stored)
    expect(model.getSnapshot().state).toEqual(state)
    expect(model.getSnapshot().busy).toBe(false)
    expect(seen).toEqual([true, false])
  })

  it('writes a patch and reports it saved', async () => {
    const model = createSettingsModel()
    await model.refresh()
    await model.save({ bark: { group: 'ray' } })

    const post = calls.find((call) => call.method === 'POST')
    expect(post?.body).toEqual({ bark: { group: 'ray' } })
    expect(model.getSnapshot().config).toMatchObject({ bark: { group: 'ray' } })
    expect(model.getSnapshot().notice).toBe('Saved')
    expect(model.getSnapshot().error).toBeNull()
  })

  it('surfaces the reason a push was refused', async () => {
    testAnswer = { ok: true, channel: 'bark', result: { ok: false, reason: 'Bark answered HTTP 400' } }
    const model = createSettingsModel()
    await model.test('bark')
    expect(model.getSnapshot().error).toBe('Bark answered HTTP 400')
    expect(model.getSnapshot().notice).toBeNull()
  })

  it('reports a transport failure without leaving the page busy', async () => {
    vi.stubGlobal('fetch', async () => {
      throw new Error('network down')
    })
    const model = createSettingsModel()
    await model.refresh()
    expect(model.getSnapshot().error).toBe('network down')
    expect(model.getSnapshot().busy).toBe(false)
  })
})
