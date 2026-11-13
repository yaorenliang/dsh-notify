/**
 * The durable plugin configuration: shape, defaults, and defensive resolution.
 *
 * The Host owns the file; the browser receives a redacted projection. Secrets
 * never travel: a client only ever sees `configured` plus a masked tail, and a
 * masked value sent back means "leave the stored one alone".
 */
import type { NotificationKind } from './events.ts'
import type { CurrentSessionMode } from './policy.ts'
import type { LocaleSetting } from './render.ts'

/** The built-in sound a kind can play. */
export type SoundId = 'chime' | 'fault' | 'pop' | 'alert'

/** One kind's per-channel preferences. */
export interface KindConfig {
  readonly enabled: boolean
  /** Built-in sound for the browser channel. */
  readonly sound: SoundId
  /** Bark sound name; `system` means the device default. */
  readonly barkSound: string
}

/** Bark delivery settings. */
export interface BarkConfig {
  readonly enabled: boolean
  /** Server root, e.g. `https://api.day.app`. */
  readonly serverUrl: string
  /** Device key; a secret, never projected to the browser in clear. */
  readonly deviceKey: string
  /** Notification group shown by the Bark app. */
  readonly group: string
  /**
   * Root of the UI a push should open, e.g. `http://127.0.0.1:3080`.
   *
   * Empty omits the link: the Host cannot guess which address reaches it from
   * the phone, so an unset value must stay unset instead of pointing at a
   * loopback address that means nothing on a device.
   */
  readonly baseUrl: string
}

/** Browser delivery settings. */
export interface BrowserConfig {
  readonly enabled: boolean
  /** Playback volume, 0..1. */
  readonly volume: number
  /** How loudly the session currently on screen may alert. */
  readonly currentSessionMode: CurrentSessionMode
}

/** The whole configuration. */
export interface NotifyConfig {
  /** Interface language for the plugin's own copy. */
  readonly locale: LocaleSetting
  /** Whether sessions spawned by another session may alert. */
  readonly notifySubagents: boolean
  readonly events: Readonly<Record<NotificationKind, KindConfig>>
  readonly browser: BrowserConfig
  readonly bark: BarkConfig
}

/** The kinds, in display order. */
export const NOTIFICATION_KINDS: readonly NotificationKind[] = ['completed', 'failed', 'interrupted', 'approval', 'question']

/** Defaults applied when the stored document says nothing. */
export const DEFAULT_CONFIG: NotifyConfig = Object.freeze({
  locale: 'auto',
  notifySubagents: false,
  events: Object.freeze({
    completed: Object.freeze({ enabled: true, sound: 'chime', barkSound: 'system' }),
    failed: Object.freeze({ enabled: true, sound: 'fault', barkSound: 'system' }),
    interrupted: Object.freeze({ enabled: true, sound: 'alert', barkSound: 'system' }),
    approval: Object.freeze({ enabled: true, sound: 'alert', barkSound: 'system' }),
    question: Object.freeze({ enabled: true, sound: 'pop', barkSound: 'system' }),
  }),
  browser: Object.freeze({ enabled: false, volume: 0.6, currentSessionMode: 'hidden' }),
  bark: Object.freeze({
    enabled: false,
    serverUrl: 'https://api.day.app',
    deviceKey: '',
    group: 'DSH',
    baseUrl: '',
  }),
})

const SOUNDS: readonly SoundId[] = ['chime', 'fault', 'pop', 'alert']
const MODES: readonly CurrentSessionMode[] = ['hidden', 'unfocused', 'always']

/** A configured-secret projection safe to send to the browser. */
export interface SecretView {
  readonly configured: boolean
  readonly masked: string
}

/** The configuration as the browser sees it. */
export type PublicConfig = Omit<NotifyConfig, 'bark'> & {
  readonly bark: Omit<BarkConfig, 'deviceKey'> & { readonly deviceKey: SecretView }
}

/** Mask a stored secret down to its last four characters. */
export function maskSecret(value: string): SecretView {
  const raw = value.trim()
  return raw.length === 0 ? { configured: false, masked: '' } : { configured: true, masked: `••••••••${raw.slice(-4)}` }
}

/** True when a browser echoed a mask instead of typing a new secret. */
export function isMaskEcho(value: unknown): boolean {
  return typeof value === 'string' && value.startsWith('••••••••')
}

/** Project the stored configuration for the browser. */
export function publicConfig(config: NotifyConfig): PublicConfig {
  const { deviceKey, ...bark } = config.bark
  return { ...config, bark: { ...bark, deviceKey: maskSecret(deviceKey) } }
}

/**
 * Merge a browser patch over the stored configuration.
 *
 * Absent, empty, or masked secrets keep the stored value; an explicit `null`
 * is the only way to erase one. Everything else is validated field by field so
 * a hand-edited document degrades to the default instead of a broken plugin.
 */
export function mergeConfig(current: NotifyConfig, patch: unknown): NotifyConfig {
  if (!isPlainObject(patch)) return current
  const events = { ...current.events }
  const rawEvents = isPlainObject(patch.events) ? patch.events : {}
  for (const kind of NOTIFICATION_KINDS) {
    const own = rawEvents[kind]
    if (!isPlainObject(own)) continue
    events[kind] = {
      enabled: typeof own.enabled === 'boolean' ? own.enabled : events[kind].enabled,
      sound: isSound(own.sound) ? own.sound : events[kind].sound,
      barkSound: typeof own.barkSound === 'string' && own.barkSound.trim().length > 0 ? own.barkSound.trim() : events[kind].barkSound,
    }
  }
  const browser = isPlainObject(patch.browser) ? patch.browser : {}
  const bark = isPlainObject(patch.bark) ? patch.bark : {}
  return {
    locale: isLocale(patch.locale) ? patch.locale : current.locale,
    notifySubagents: typeof patch.notifySubagents === 'boolean' ? patch.notifySubagents : current.notifySubagents,
    events,
    browser: {
      enabled: typeof browser.enabled === 'boolean' ? browser.enabled : current.browser.enabled,
      volume: typeof browser.volume === 'number' && Number.isFinite(browser.volume) ? clamp(browser.volume, 0, 1) : current.browser.volume,
      currentSessionMode: isMode(browser.currentSessionMode) ? browser.currentSessionMode : current.browser.currentSessionMode,
    },
    bark: {
      enabled: typeof bark.enabled === 'boolean' ? bark.enabled : current.bark.enabled,
      serverUrl: typeof bark.serverUrl === 'string' && bark.serverUrl.trim().length > 0 ? bark.serverUrl.trim().replace(/\/+$/, '') : current.bark.serverUrl,
      deviceKey: resolveSecret(bark.deviceKey, current.bark.deviceKey),
      group: typeof bark.group === 'string' && bark.group.trim().length > 0 ? bark.group.trim() : current.bark.group,
      baseUrl: typeof bark.baseUrl === 'string' ? bark.baseUrl.trim() : current.bark.baseUrl,
    },
  }
}

/** Read a stored document into a complete configuration. */
export function resolveConfig(raw: unknown): NotifyConfig {
  return mergeConfig(DEFAULT_CONFIG, raw)
}

function resolveSecret(next: unknown, stored: string): string {
  if (next === null) return ''
  if (isMaskEcho(next)) return stored
  if (typeof next !== 'string' || next.trim().length === 0) return stored
  return next.trim()
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isSound(value: unknown): value is SoundId {
  return typeof value === 'string' && (SOUNDS as readonly string[]).includes(value)
}

function isLocale(value: unknown): value is LocaleSetting {
  return value === 'auto' || value === 'zh' || value === 'en'
}

function isMode(value: unknown): value is CurrentSessionMode {
  return typeof value === 'string' && (MODES as readonly string[]).includes(value)
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
