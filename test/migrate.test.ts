import { describe, expect, it } from 'vitest'
import { fromLegacy, isLegacyDocument } from '../src/host/migrate.ts'

const legacy = {
  titlePrefix: 'DSH',
  webUrl: 'http://mac-mini:3080',
  notifyOnTurnEnd: true,
  notifyOnApproval: true,
  notifyOnQuestion: false,
  notifyOnError: true,
  bark: {
    enabled: true,
    serverUrl: 'https://api.day.app',
    deviceKey: 'legacy-key-1234',
    icon: 'https://example.test/i.png',
    group: 'DeepSeek Harness',
    sound: 'bell',
    soundTurnEnd: 'chime',
  },
}

describe('fromLegacy', () => {
  it('recognises a legacy document', () => {
    expect(isLegacyDocument(legacy)).toBe(true)
    expect(isLegacyDocument({ hello: 1 })).toBe(false)
  })

  it('carries the prefix, root, key, group, and icon across', () => {
    const config = fromLegacy(legacy)
    expect(config.prefix).toBe('DSH')
    expect(config.baseUrl).toBe('http://mac-mini:3080')
    expect(config.bark).toMatchObject({ enabled: true, deviceKey: 'legacy-key-1234', group: 'DeepSeek Harness', icon: 'https://example.test/i.png' })
  })

  it('maps the per-event switches', () => {
    const config = fromLegacy(legacy)
    expect(config.events.completed.enabled).toBe(true)
    expect(config.events.failed.enabled).toBe(true)
    expect(config.events.question.enabled).toBe(false)
    expect(config.events.approval.enabled).toBe(true)
  })

  it('prefers a per-event sound and falls back to the shared one', () => {
    const config = fromLegacy(legacy)
    expect(config.events.completed.barkSound).toBe('chime')
    expect(config.events.approval.barkSound).toBe('bell')
  })

  it('keeps Bark off when the key is empty', () => {
    const config = fromLegacy({ ...legacy, bark: { ...legacy.bark, deviceKey: '  ' } })
    expect(config.bark.enabled).toBe(false)
  })

  it('returns the defaults for a foreign document', () => {
    expect(fromLegacy({ hello: 1 }).bark.enabled).toBe(false)
  })
})
