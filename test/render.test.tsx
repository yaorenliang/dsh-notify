import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { NotificationsSection } from '../src/client/settings/section.tsx'
import { DEFAULT_CONFIG, publicConfig } from '../src/core/config.ts'
import type { PublicConfig } from '../src/core/config.ts'
import type { SettingsModel, SettingsSnapshot } from '../src/client/model.ts'

/** A model that never changes: the page renders one snapshot and issues nothing. */
function stillModel(snapshot: SettingsSnapshot): SettingsModel {
  return {
    getSnapshot: () => snapshot,
    subscribe: () => () => {},
    refresh: async () => {},
    save: async () => {},
    test: async () => {},
    requestPermission: async () => {},
  }
}

function snapshot(config: PublicConfig, patch: Partial<SettingsSnapshot> = {}): SettingsSnapshot {
  return {
    config,
    state: { ok: true, browsers: 2, channels: { browser: true, bark: true }, presence: null },
    permission: 'granted',
    busy: false,
    error: null,
    notice: null,
    ...patch,
  }
}

function withChannels(patch: Partial<PublicConfig> = {}): PublicConfig {
  const base = publicConfig({
    ...DEFAULT_CONFIG,
    browser: { ...DEFAULT_CONFIG.browser, enabled: true },
    bark: { ...DEFAULT_CONFIG.bark, enabled: true, deviceKey: 'key-123456789' },
  })
  return { ...base, ...patch }
}

const render = (model: SettingsModel): string => renderToStaticMarkup(<NotificationsSection model={model} />)

describe('settings page', () => {
  it('renders the whole page without throwing', () => {
    const html = render(stillModel(snapshot(withChannels())))
    expect(html).toContain('Session alerts')
    expect(html).toContain('Reminders')
  })

  it('keeps the quieting rules right under the master switch', () => {
    const html = render(stillModel(snapshot(withChannels())))
    const master = html.indexOf('Reminders')
    const timing = html.indexOf('Alert for the open session')
    const subagent = html.indexOf('Notify for subagent sessions')
    const channels = html.indexOf('Channels')
    expect(master).toBeGreaterThan(-1)
    expect(timing).toBeGreaterThan(master)
    expect(subagent).toBeGreaterThan(timing)
    expect(channels).toBeGreaterThan(subagent)
  })

  it('folds a channel open only while it is enabled', () => {
    const open = render(stillModel(snapshot(withChannels())))
    expect(open).toContain('Server URL')
    expect(open).toContain('Device key')

    const closed = publicConfig({ ...DEFAULT_CONFIG })
    const html = render(stillModel(snapshot(closed)))
    expect(html).not.toContain('Server URL')
    expect(html).not.toContain('Device key')
    expect(html).toContain('No reminder channel is enabled yet.')
  })

  it('lists every event with both sound pickers and no advanced block', () => {
    const html = render(stillModel(snapshot(withChannels())))
    for (const name of ['Session completed', 'Session failed', 'Session interrupted', 'Approval needed', 'Question waiting']) {
      expect(html).toContain(name)
    }
    expect(html.match(/Local sound/g)?.length).toBeGreaterThan(0)
    expect(html.match(/Phone sound/g)?.length).toBeGreaterThan(0)
    expect(html).not.toContain('Advanced')
    expect(html).not.toContain('Title prefix')
  })

  it('never prints the stored device key', () => {
    const html = render(stillModel(snapshot(withChannels())))
    expect(html).not.toContain('key-123456789')
    expect(html).toContain('••••••••6789')
  })

  it('shows the failure bar when the last command failed', () => {
    const html = render(stillModel(snapshot(withChannels(), { error: 'network down' })))
    expect(html).toContain('network down')
  })
})
