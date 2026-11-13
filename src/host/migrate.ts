/**
 * First-run migration from `dsh-push-notify`.
 *
 * The old plugin kept `push-notify-config.json` in the same profile directory.
 * Reading it once means installing this plugin does not silently drop a working
 * Bark key; the legacy document itself is left untouched so rolling back stays
 * possible.
 */
import { resolveConfig, type NotifyConfig } from '../core/config.ts'

/** The legacy document's fields this migration reads. */
interface LegacyDocument {
  readonly titlePrefix?: unknown
  readonly webUrl?: unknown
  readonly notifyOnTurnEnd?: unknown
  readonly notifyOnApproval?: unknown
  readonly notifyOnQuestion?: unknown
  readonly notifyOnError?: unknown
  readonly bark?: {
    readonly enabled?: unknown
    readonly serverUrl?: unknown
    readonly deviceKey?: unknown
    readonly icon?: unknown
    readonly group?: unknown
    readonly sound?: unknown
    readonly soundTurnEnd?: unknown
    readonly soundApproval?: unknown
    readonly soundQuestion?: unknown
    readonly soundError?: unknown
  }
}

/** Whether a parsed document looks like the legacy configuration. */
export function isLegacyDocument(value: unknown): value is LegacyDocument {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  return 'bark' in record || 'notifyOnTurnEnd' in record || 'titlePrefix' in record
}

/**
 * Translate a legacy document into this plugin's configuration.
 *
 * Mapping follows the old plugin's own semantics: one switch per channel event,
 * and the per-event Bark sound falling back to its single `sound` field.
 */
export function fromLegacy(value: unknown): NotifyConfig {
  if (!isLegacyDocument(value)) return resolveConfig(undefined)
  const bark = value.bark ?? {}
  const deviceKey = typeof bark.deviceKey === 'string' ? bark.deviceKey.trim() : ''
  const soundOf = (specific: unknown): string =>
    typeof specific === 'string' && specific.trim().length > 0
      ? specific.trim()
      : typeof bark.sound === 'string' && bark.sound.trim().length > 0
        ? bark.sound.trim()
        : 'system'
  return resolveConfig({
    prefix: typeof value.titlePrefix === 'string' ? value.titlePrefix : '',
    baseUrl: typeof value.webUrl === 'string' ? value.webUrl : '',
    notifySubagents: false,
    bark: {
      enabled: bark.enabled === true && deviceKey.length > 0,
      ...(typeof bark.serverUrl === 'string' && bark.serverUrl.trim().length > 0 ? { serverUrl: bark.serverUrl } : {}),
      deviceKey,
      ...(typeof bark.group === 'string' && bark.group.trim().length > 0 ? { group: bark.group } : {}),
      ...(typeof bark.icon === 'string' ? { icon: bark.icon } : {}),
    },
    events: {
      completed: { enabled: value.notifyOnTurnEnd !== false, barkSound: soundOf(bark.soundTurnEnd) },
      failed: { enabled: value.notifyOnError !== false, barkSound: soundOf(bark.soundError) },
      interrupted: { enabled: value.notifyOnError !== false, barkSound: soundOf(bark.soundError) },
      approval: { enabled: value.notifyOnApproval !== false, barkSound: soundOf(bark.soundApproval) },
      question: { enabled: value.notifyOnQuestion !== false, barkSound: soundOf(bark.soundQuestion) },
    },
  })
}
