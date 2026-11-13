import { describe, expect, it, vi } from 'vitest'
import { ConfigStore } from '../src/host/store.ts'

function memoryStore(initial: string | null) {
  let text = initial
  const warnings: string[] = []
  const store = new ConfigStore({
    file: '/tmp/dsh-notify-test.json',
    readText: () => {
      if (text === null) throw Object.assign(new Error('missing'), { code: 'ENOENT' })
      return text
    },
    writeText: (_path, next) => { text = next },
    warn: (message) => warnings.push(message),
  })
  return { store, warnings, text: () => text }
}

describe('ConfigStore', () => {
  it('keeps the defaults when the file is missing', () => {
    const { store, warnings } = memoryStore(null)
    expect(store.load().bark.group).toBe('DSH')
    expect(warnings).toEqual([])
  })

  it('warns and falls back on a malformed document', () => {
    const { store, warnings } = memoryStore('{ not json')
    expect(store.load().browser.enabled).toBe(false)
    expect(warnings).toHaveLength(1)
  })

  it('reads a stored document', () => {
    const { store } = memoryStore(JSON.stringify({ locale: 'zh', bark: { enabled: true, deviceKey: 'k' } }))
    expect(store.load().locale).toBe('zh')
    expect(store.get().bark.deviceKey).toBe('k')
  })

  it('persists a patch', () => {
    const { store, text } = memoryStore(null)
    store.load()
    store.update({ bark: { group: 'ray' } })
    expect(store.get().bark.group).toBe('ray')
    expect(JSON.parse(text() ?? '{}').bark.group).toBe('ray')
  })

  it('does not lose a stored secret when the browser echoes the mask', () => {
    const { store } = memoryStore(JSON.stringify({ bark: { enabled: true, deviceKey: 'stored-key-1234' } }))
    store.load()
    expect(store.update({ bark: { deviceKey: '••••••••1234' } }).bark.deviceKey).toBe('stored-key-1234')
  })
})
