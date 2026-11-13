import { describe, expect, it, vi } from 'vitest'
import { Dispatcher } from '../src/host/dispatcher.ts'
import { DEFAULT_CONFIG, mergeConfig } from '../src/core/config.ts'
import type { NotificationEvent } from '../src/core/events.ts'

const at = 1_700_000_000_000
const event: NotificationEvent = { id: 'turn-1', kind: 'completed', sessionId: 's1', sessionTitle: 'Build', body: 'Done', at }

function setup(
  configPatch: Record<string, unknown> = { bark: { enabled: true, deviceKey: 'k' }, browser: { enabled: true } },
  clock: { now: number } = { now: at },
) {
  const browser = vi.fn((_event: NotificationEvent, _title: string) => true)
  const bark = vi.fn(async () => ({ ok: true as const }))
  const config = mergeConfig(DEFAULT_CONFIG, configPatch)
  const dispatcher = new Dispatcher({ config: () => config, presence: () => null, browser, bark, now: () => clock.now })
  return { dispatcher, browser, bark, clock }
}

describe('Dispatcher', () => {
  it('delivers one event to both channels', () => {
    const { dispatcher, browser, bark } = setup()
    const outcome = dispatcher.dispatch(event, { subagent: false })
    expect(outcome.delivered).toBe(true)
    expect(outcome.channels).toEqual(['browser', 'bark'])
    expect(browser).toHaveBeenCalledWith(event, expect.stringContaining('Build'))
    expect(bark).toHaveBeenCalledTimes(1)
  })

  it('collapses the same id twice', () => {
    const { dispatcher, browser } = setup()
    dispatcher.dispatch(event, { subagent: false })
    const second = dispatcher.dispatch(event, { subagent: false })
    expect(second.suppressed).toBe('duplicate')
    expect(browser).toHaveBeenCalledTimes(1)
  })

  it('lets a replacement interaction through under a new id', () => {
    const { dispatcher, browser } = setup()
    dispatcher.dispatch({ ...event, kind: 'approval', id: 'a-1' }, { subagent: false })
    dispatcher.dispatch({ ...event, kind: 'approval', id: 'a-2' }, { subagent: false })
    expect(browser).toHaveBeenCalledTimes(2)
  })

  it('silences a subagent session', () => {
    const { dispatcher } = setup()
    expect(dispatcher.dispatch(event, { subagent: true }).suppressed).toBe('subagent')
  })

  it('reports no-channel when both channels are off', () => {
    const { dispatcher } = setup({})
    expect(dispatcher.dispatch(event, { subagent: false }).suppressed).toBe('no-channel')
  })

  it('skips bark when the device key is missing', () => {
    const { dispatcher, bark } = setup({ browser: { enabled: true }, bark: { enabled: true } })
    const outcome = dispatcher.dispatch(event, { subagent: false })
    expect(outcome.channels).toEqual(['browser'])
    expect(bark).not.toHaveBeenCalled()
  })

  it('holds the burst limit per session and then recovers', () => {
    const { dispatcher, clock, browser } = setup()
    for (let index = 0; index < 6; index += 1) {
      expect(dispatcher.dispatch({ ...event, id: `t${index}` }, { subagent: false }).delivered).toBe(true)
    }
    expect(dispatcher.dispatch({ ...event, id: 't7' }, { subagent: false }).suppressed).toBe('rate-limit')
    expect(browser).toHaveBeenCalledTimes(6)

    clock.now += 61_000
    expect(dispatcher.dispatch({ ...event, id: 't8' }, { subagent: false }).delivered).toBe(true)
  })

  it('reports only the channels that actually delivered', () => {
    const { dispatcher, browser } = setup()
    browser.mockReturnValue(false)
    const outcome = dispatcher.dispatch(event, { subagent: false })
    expect(outcome.delivered).toBe(true)
    expect(outcome.channels).toEqual(['bark'])
  })

  it('lets a repeated id through once its window has passed', () => {
    const { dispatcher, clock } = setup()
    dispatcher.dispatch(event, { subagent: false })
    clock.now += 11 * 60_000
    expect(dispatcher.dispatch(event, { subagent: false }).delivered).toBe(true)
  })

  it('applies the prefix to the title', () => {
    const { dispatcher, browser } = setup({ prefix: 'dsh', browser: { enabled: true } })
    dispatcher.dispatch(event, { subagent: false })
    expect(browser.mock.calls[0]?.[1]).toBe('[dsh] ✅ Build')
  })
})
