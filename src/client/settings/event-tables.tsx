/**
 * The event table: one row per kind, both sounds, a preview, and the two channel
 * tests with their readiness dots.
 */
import type { ReactNode } from 'react'
import { NOTIFICATION_KINDS } from '../../core/config.ts'
import type { PublicConfig, SoundId } from '../../core/config.ts'
import type { NotificationKind } from '../../core/events.ts'
import { t } from '../i18n.ts'
import type { MessageKey } from '../i18n.ts'
import { play } from '../notify.ts'
import type { Permission } from '../notify.ts'
import { Button, SelectMenu, StateDot, Switch } from './primitives.tsx'
import { Block } from './layout.tsx'

/** One event row's copy and the kind it edits. */
interface EventCopy {
  readonly kind: NotificationKind
  readonly title: MessageKey
  readonly description: MessageKey
}

/** The events, in the order a turn moves through them. */
const EVENTS: readonly EventCopy[] = [
  { kind: 'completed', title: 'events.completed', description: 'events.completed.desc' },
  { kind: 'failed', title: 'events.failed', description: 'events.failed.desc' },
  { kind: 'interrupted', title: 'events.interrupted', description: 'events.interrupted.desc' },
  { kind: 'approval', title: 'events.approval', description: 'events.approval.desc' },
  { kind: 'question', title: 'events.question', description: 'events.question.desc' },
]

/** The built-in browser sounds, in the order the table lists them. */
const SOUNDS: readonly { readonly value: SoundId; readonly label: MessageKey }[] = [
  { value: 'chime', label: 'sound.browser.chime' },
  { value: 'fault', label: 'sound.browser.fault' },
  { value: 'pop', label: 'sound.browser.pop' },
  { value: 'alert', label: 'sound.browser.alert' },
]

/** The Bark sound names the app understands. */
const BARK_SOUNDS: readonly { readonly value: string; readonly label: MessageKey }[] = [
  { value: 'system', label: 'barkSound.system' },
  { value: 'bell', label: 'barkSound.bell' },
  { value: 'glass', label: 'barkSound.glass' },
  { value: 'paymentsuccess', label: 'barkSound.paymentsuccess' },
  { value: 'chime', label: 'barkSound.chime' },
  { value: 'bloom', label: 'barkSound.bloom' },
  { value: 'calypso', label: 'barkSound.calypso' },
  { value: 'birdsong', label: 'barkSound.birdsong' },
  { value: 'fanfare', label: 'barkSound.fanfare' },
  { value: 'telegraph', label: 'barkSound.telegraph' },
  { value: 'electronic', label: 'barkSound.electronic' },
  { value: 'horn', label: 'barkSound.horn' },
  { value: 'typewriters', label: 'barkSound.typewriters' },
  { value: 'minuet', label: 'barkSound.minuet' },
  { value: 'alarm', label: 'barkSound.alarm' },
  { value: 'silence', label: 'barkSound.silence' },
]

const SOUND_OPTIONS = SOUNDS.map((sound) => ({ value: sound.value, label: t(sound.label) }))
const BARK_OPTIONS = BARK_SOUNDS.map((sound) => ({ value: sound.value, label: t(sound.label) }))

export function DetailBlocks(props: {
  readonly config: PublicConfig
  readonly permission: Permission
  readonly busy: boolean
  readonly disabled: boolean
  readonly onSave: (patch: unknown) => void
  readonly onTest: (channel: 'browser' | 'bark') => void
  readonly onAudition: (kind: NotificationKind, sound: string) => void
}): ReactNode {
  return (
    <>
      <Block title={t('events.title')}>
        <EventSoundTable
          config={props.config}
          disabled={props.disabled}
          onSave={props.onSave}
          onAudition={props.onAudition}
        />
      </Block>

      <Block title={t('status.title')}>
        <ChannelStatus
          config={props.config}
          permission={props.permission}
          busy={props.busy}
          onTest={props.onTest}
        />
      </Block>
    </>
  )
}

/** Both channels in one card, with the hairline the shell uses between rows. */

function EventSoundTable(props: {
  readonly config: PublicConfig
  readonly disabled: boolean
  readonly onSave: (patch: unknown) => void
  readonly onAudition: (kind: NotificationKind, sound: string) => void
}): ReactNode {
  const { config, disabled, onSave, onAudition } = props
  const allEventsOff = NOTIFICATION_KINDS.every((kind) => !config.events[kind].enabled)

  return (
    <div className="dn-card">
      <div className="dn-sound">
        <div className="dn-sound__head">
          <span>{t('sound.tableEvent')}</span>
          <span />
          <span>{t('sound.tableLocal')}</span>
          <span>{t('sound.tableBark')}</span>
          <span />
        </div>
        {EVENTS.map((event) => (
          <div className="dn-sound__row" key={event.kind}>
            <span className="dn-sound__name" title={t(event.description)}>{t(event.title)}</span>
            <Switch
              label={t(event.title)}
              checked={config.events[event.kind].enabled}
              disabled={disabled}
              onChange={(next) => onSave({ events: { [event.kind]: { enabled: next } } })}
            />
            <SelectMenu<SoundId>
              label={t('sound.tableLocal')}
              value={config.events[event.kind].sound}
              options={SOUND_OPTIONS}
              disabled={disabled || !config.browser.enabled}
              onChange={(sound) => {
                onSave({ events: { [event.kind]: { sound } } })
                // Both pickers audition on change: the local one here, the phone
                // one through the Host, because the phone plays its own sound.
                play(sound, config.browser.volume)
              }}
            />
            <SelectMenu<string>
              label={t('sound.tableBark')}
              value={config.events[event.kind].barkSound}
              options={BARK_OPTIONS}
              disabled={disabled || !config.bark.enabled}
              onChange={(barkSound) => {
                onSave({ events: { [event.kind]: { barkSound } } })
                // Without a device key a push has no destination; saying so on
                // every pick would be a permanent error bar, so stay quiet.
                if (config.bark.deviceKey.configured) onAudition(event.kind, barkSound)
              }}
            />
            <Button
              variant="ghost"
              disabled={disabled || !config.browser.enabled}
              title={t('sound.previewTitle', { name: t(SOUNDS.find((sound) => sound.value === config.events[event.kind].sound)?.label ?? 'sound.browser.chime') })}
              onClick={() => play(config.events[event.kind].sound, config.browser.volume)}
            >
              {t('sound.preview')}
            </Button>
          </div>
        ))}
      </div>
      {allEventsOff ? <p className="dn-warn">{t('events.empty')}</p> : null}
    </div>
  )
}

/** The two channel tests and their readiness dots. */
function ChannelStatus(props: {
  readonly config: PublicConfig
  readonly permission: Permission
  readonly busy: boolean
  readonly onTest: (channel: 'browser' | 'bark') => void
}): ReactNode {
  const { config, permission, busy, onTest } = props
  const pushBlocked = busy || !config.bark.enabled || !config.bark.deviceKey.configured
  const browserBlocked = busy || !config.browser.enabled || permission !== 'granted'

  return (
    <div className="dn-card">
      <div className="dn-stack">
        <div className="dn-statusLine">
          <StateDot state={permission === 'granted' ? 'done' : 'idle'} />
          <span className="dn-rowTitle">{t('status.browserChannel')}</span>
          <Button disabled={browserBlocked} title={browserBlocked ? t('status.testBrowserBlocked') : undefined} onClick={() => void onTest('browser')}>
            {t('status.testBrowser')}
          </Button>
        </div>
        <div className="dn-statusLine">
          <StateDot state={config.bark.deviceKey.configured && config.bark.enabled ? 'done' : 'idle'} />
          <span className="dn-rowTitle">{t('status.barkChannel')}</span>
          <Button disabled={pushBlocked} title={pushBlocked ? t('status.testPushBlocked') : undefined} onClick={() => void onTest('bark')}>
            {t('status.testPush')}
          </Button>
        </div>
      </div>
    </div>
  )
}

/** The repository this page ships from. */