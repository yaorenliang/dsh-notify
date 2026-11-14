import { describe, expect, it } from 'vitest'
import { classifyTurnEnd, truncate } from '../src/core/events.ts'
import { approvalBody, completedBody, failedBody, interruptedBody, resolveLocale } from '../src/core/render.ts'
import { DEFAULT_CONFIG, mergeConfig, maskSecret, publicConfig, resolveConfig } from '../src/core/config.ts'
import { DEFAULT_POLICY, collapseKey, decideDelivery } from '../src/core/policy.ts'
import type { NotificationEvent } from '../src/core/events.ts'

const at = 1_700_000_000_000

function event(over: Partial<NotificationEvent> = {}): NotificationEvent {
  return { id: 'e1', kind: 'completed', sessionId: 's1', sessionTitle: 'Fix the build', body: 'Done', at, ...over }
}

describe('classifyTurnEnd', () => {
  it('stays silent when the reason is missing', () => {
    expect(classifyTurnEnd(null)).toEqual({ kind: 'silent' })
  })

  it('keeps a completed kind', () => {
    expect(classifyTurnEnd({ kind: 'completed' })).toEqual({ kind: 'completed' })
  })

  it('keeps the provider facts for an error', () => {
    expect(classifyTurnEnd({ kind: 'error', error: { code: 'QUOTA', message: 'quota exhausted' } }))
      .toEqual({ kind: 'failed', code: 'QUOTA', message: 'quota exhausted' })
  })

  it('accepts an error with no message', () => {
    expect(classifyTurnEnd({ kind: 'error' })).toEqual({ kind: 'failed', code: null, message: '' })
  })

  it('passes the abort payload through untouched', () => {
    const reason = { kind: 'aborted', reason: { kind: 'hook', reason: 'deepseek-account/signed-out' } }
    expect(classifyTurnEnd(reason)).toEqual({ kind: 'interrupted', reason })
  })

  it('stays silent for endings nobody asked to be told about', () => {
    expect(classifyTurnEnd({ kind: 'max-tokens' })).toEqual({ kind: 'silent' })
    expect(classifyTurnEnd({ kind: 'blocked' })).toEqual({ kind: 'silent' })
    expect(classifyTurnEnd({ kind: 'forked' })).toEqual({ kind: 'silent' })
    expect(classifyTurnEnd({ kind: 'something-new' })).toEqual({ kind: 'silent' })
  })
})

describe('render', () => {
  it('leads a completion with what the person asked', () => {
    expect(completedBody('Fix the build', 'All green.', 'en')).toBe('Fix the build')
  })

  it('falls back to the answer when the turn had no human prompt', () => {
    expect(completedBody('  ', 'All green.', 'en')).toBe('All green.')
    expect(completedBody('', '   ', 'zh')).toBe('本轮已完成。')
  })

  it('appends the outcome to the prompt for a failure', () => {
    expect(failedBody('Fix the build', 'E_TIMEOUT', 'upstream timed out', 'en'))
      .toBe('Fix the build · upstream timed out (E_TIMEOUT)')
    expect(failedBody('', 'QUOTA', 'whatever', 'zh')).toContain('额度')
    expect(failedBody('', 'QUOTA', 'whatever', 'en')).toContain('quota')
    expect(failedBody('Fix the build', null, '', 'en')).toBe('Fix the build · The turn failed before it could answer.')
  })

  it('appends the reason to the prompt for an interruption', () => {
    expect(interruptedBody('Fix the build', { kind: 'aborted' }, 'en')).toBe('Fix the build · The turn was aborted.')
    expect(interruptedBody('', { kind: 'aborted', reason: { kind: 'hook', reason: 'deepseek-account/signed-out' } }, 'en'))
      .toContain('signed out')
  })

  it('frames an approval with the tool name and reason', () => {
    expect(approvalBody('bash', 'needs network', 'en')).toBe('Tool bash is waiting for permission: needs network')
    expect(approvalBody('bash', '', 'zh')).toBe('工具 bash 正在请求执行权限')
  })

  it('resolves the locale from the environment', () => {
    expect(resolveLocale('auto', 'zh-CN')).toBe('zh')
    expect(resolveLocale('auto', 'en-US')).toBe('en')
    expect(resolveLocale('en', 'zh-CN')).toBe('en')
  })
})

describe('truncate', () => {
  it('flattens whitespace', () => {
    expect(truncate('a\n\n b   c')).toBe('a b c')
  })

  it('cuts on a sentence boundary when one is late enough', () => {
    const text = `${'word '.repeat(20)}. ${'more '.repeat(40)}`
    const cut = truncate(text, 120)
    expect(cut.endsWith('.')).toBe(true)
    expect(cut.length).toBeLessThanOrEqual(121)
  })

  it('adds an ellipsis when no boundary exists', () => {
    const cut = truncate('x'.repeat(300), 100)
    expect(cut.endsWith('…')).toBe(true)
    expect(cut.length).toBe(101)
  })
})

describe('decideDelivery', () => {
  const main = { subagent: false }

  it('silences a subagent session by default', () => {
    expect(decideDelivery(event(), { subagent: true }, null)).toEqual({ deliver: false, suppression: 'subagent' })
  })

  it('lets a subagent through when the policy allows it', () => {
    expect(decideDelivery(event(), { subagent: true }, null, { ...DEFAULT_POLICY, notifySubagents: true }).deliver).toBe(true)
  })

  it('stays quiet while the same session is visible and focused', () => {
    const presence = { visible: true, focused: true, sessionId: 's1', at }
    expect(decideDelivery(event(), main, presence, DEFAULT_POLICY, at + 1000)).toEqual({ deliver: false, suppression: 'current-session' })
  })

  it('alerts a hidden tab for the same session', () => {
    const presence = { visible: false, focused: false, sessionId: 's1', at }
    expect(decideDelivery(event(), main, presence, DEFAULT_POLICY, at + 1000).deliver).toBe(true)
  })

  it('widens to unfocused tabs in the unfocused mode', () => {
    const presence = { visible: true, focused: false, sessionId: 's1', at }
    const policy = { ...DEFAULT_POLICY, currentSessionMode: 'unfocused' as const }
    expect(decideDelivery(event(), main, presence, policy, at + 1000).deliver).toBe(true)
  })

  it('ignores a stale presence report and delivers', () => {
    const presence = { visible: true, focused: true, sessionId: 's1', at }
    expect(decideDelivery(event(), main, presence, DEFAULT_POLICY, at + DEFAULT_POLICY.presenceTtlMs + 1).deliver).toBe(true)
  })

  it('delivers for another session regardless of focus', () => {
    const presence = { visible: true, focused: true, sessionId: 's2', at }
    expect(decideDelivery(event(), main, presence, DEFAULT_POLICY, at + 1000).deliver).toBe(true)
  })

  it('always delivers in the always mode', () => {
    const presence = { visible: true, focused: true, sessionId: 's1', at }
    const policy = { ...DEFAULT_POLICY, currentSessionMode: 'always' as const }
    expect(decideDelivery(event(), main, presence, policy, at + 1000).deliver).toBe(true)
  })
})

describe('collapseKey', () => {
  it('distinguishes kinds and ids', () => {
    expect(collapseKey(event())).toBe('completed:e1')
    expect(collapseKey(event({ kind: 'approval' }))).toBe('approval:e1')
  })
})

describe('config', () => {
  it('resolves an empty document to the defaults', () => {
    expect(resolveConfig(undefined)).toEqual(DEFAULT_CONFIG)
  })

  it('drops malformed fields instead of breaking', () => {
    const cfg = mergeConfig(DEFAULT_CONFIG, { locale: 42, bark: { enabled: 'yes', serverUrl: '' }, browser: { volume: 9 } })
    expect(cfg.locale).toBe('auto')
    expect(cfg.bark.enabled).toBe(false)
    expect(cfg.bark.serverUrl).toBe('https://api.day.app')
    expect(cfg.browser.volume).toBe(1)
  })

  it('keeps a stored secret when the browser echoes the mask', () => {
    const stored = mergeConfig(DEFAULT_CONFIG, { bark: { enabled: true, deviceKey: 'abc123456789' } })
    const next = mergeConfig(stored, { bark: { deviceKey: `••••••••6789` } })
    expect(next.bark.deviceKey).toBe('abc123456789')
  })

  it('keeps a stored secret when the field is empty or absent', () => {
    const stored = mergeConfig(DEFAULT_CONFIG, { bark: { deviceKey: 'abc123456789' } })
    expect(mergeConfig(stored, { bark: { deviceKey: '   ' } }).bark.deviceKey).toBe('abc123456789')
    expect(mergeConfig(stored, { bark: {} }).bark.deviceKey).toBe('abc123456789')
  })

  it('erases a secret only on an explicit null', () => {
    const stored = mergeConfig(DEFAULT_CONFIG, { bark: { deviceKey: 'abc123456789' } })
    expect(mergeConfig(stored, { bark: { deviceKey: null } }).bark.deviceKey).toBe('')
  })

  it('never projects the raw secret', () => {
    const stored = mergeConfig(DEFAULT_CONFIG, { bark: { enabled: true, deviceKey: 'secret-key-9999' } })
    const view = publicConfig(stored)
    expect(JSON.stringify(view)).not.toContain('secret-key-9999')
    expect(view.bark.deviceKey).toEqual({ configured: true, masked: '••••••••9999' })
  })

  it('masks an absent secret', () => {
    expect(maskSecret('')).toEqual({ configured: false, masked: '' })
  })
})
