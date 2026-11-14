/**
 * The "Settings → Notifications" page.
 *
 * One page, one configuration. The master switch and the two quieting rules sit
 * at the top, because they answer the only question that matters before the
 * plumbing does: when am I willing to be interrupted? Each channel then folds
 * open exactly when it is on, so the page carries no disabled furniture.
 */
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import { NOTIFICATION_KINDS } from '../../core/config.ts'
import type { PublicConfig, SoundId } from '../../core/config.ts'
import type { NotificationKind } from '../../core/events.ts'
import type { CurrentSessionMode } from '../../core/policy.ts'
import { t } from '../i18n.ts'
import type { MessageKey } from '../i18n.ts'
import type { SettingsModel } from '../model.ts'
import { play } from '../notify.ts'
import type { Permission } from '../notify.ts'
import { Button, Segmented, SelectMenu, StateDot, Switch, Tag } from './primitives.tsx'
import { injectStyles } from './styles.ts'

/** What the page receives from its registration. */
export interface NotificationsSectionProps {
  /** The store the page reads and commands. */
  readonly model: SettingsModel
}

/** Text a person types before it is committed. */
interface Drafts {
  readonly serverUrl?: string | undefined
  readonly deviceKey?: string | undefined
  readonly group?: string | undefined
  readonly baseUrl?: string | undefined
}

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

/** The three answers to "may the session on screen still alert?". */
const MODES: readonly { readonly value: CurrentSessionMode; readonly label: MessageKey }[] = [
  { value: 'hidden', label: 'timing.hidden' },
  { value: 'unfocused', label: 'timing.unfocused' },
  { value: 'always', label: 'timing.always' },
]

const SOUND_OPTIONS = SOUNDS.map((sound) => ({ value: sound.value, label: t(sound.label) }))
const BARK_OPTIONS = BARK_SOUNDS.map((sound) => ({ value: sound.value, label: t(sound.label) }))
const MODE_OPTIONS = MODES.map((mode) => ({ value: mode.value, label: t(mode.label) }))

/**
 * The page.
 *
 * The snapshot is the only source of truth; the component keeps drafts for the
 * connection form and the volume slider, and nothing else.
 */
export function NotificationsSection({ model }: NotificationsSectionProps): ReactNode {
  const snapshot = useSyncExternalStore(model.subscribe, model.getSnapshot, model.getSnapshot)
  const [drafts, setDrafts] = useState<Drafts>({})
  const [volumeDraft, setVolumeDraft] = useState<number | null>(null)
  const lastChannels = useRef<{ browser: boolean; bark: boolean }>({ browser: false, bark: false })

  useEffect(() => {
    injectStyles()
  }, [])

  const config = snapshot.config
  const busy = snapshot.busy

  // Remember what "on" looked like, so the master switch can restore it.
  useEffect(() => {
    if (config === null) return
    if (config.browser.enabled || config.bark.enabled) {
      lastChannels.current = { browser: config.browser.enabled, bark: config.bark.enabled }
    }
  }, [config])

  if (config === null) {
    return (
      <div className="dn-section">
        <header className="dn-header">
          <h2 className="dn-title">{t('page.title')}</h2>
          <p className="dn-intro">{busy ? t('page.loading') : t('page.loadFailed')}</p>
        </header>
        {snapshot.error === null ? null : <ErrorBar text={snapshot.error} onRetry={() => void model.refresh()} />}
        <div className="dn-skeleton" aria-hidden="true">
          <div className="dn-skeleton__line dn-skeleton__line--short" />
          <div className="dn-skeleton__line" />
          <div className="dn-skeleton__line" />
        </div>
      </div>
    )
  }

  const save = (patch: unknown): void => void model.save(patch)
  const edit = (patch: Drafts): void => setDrafts((previous) => ({ ...previous, ...patch }))

  const masterOn = config.browser.enabled || config.bark.enabled
  const locked = !masterOn
  const disabled = busy || locked

  const storedVolume = Math.round(config.browser.volume * 100)
  const volume = volumeDraft ?? storedVolume

  const serverUrl = drafts.serverUrl ?? config.bark.serverUrl
  const group = drafts.group ?? config.bark.group
  const baseUrl = drafts.baseUrl ?? config.bark.baseUrl
  const serverUrlInvalid = !isHttpUrl(normalizeServerUrl(serverUrl))
  const baseUrlInvalid = baseUrl.trim().length > 0 && !isHttpUrl(baseUrl.trim())
  const dirty =
    (drafts.serverUrl !== undefined && normalizeServerUrl(drafts.serverUrl) !== config.bark.serverUrl) ||
    (drafts.group !== undefined && drafts.group.trim() !== config.bark.group) ||
    (drafts.baseUrl !== undefined && drafts.baseUrl.trim() !== config.bark.baseUrl) ||
    (drafts.deviceKey !== undefined && drafts.deviceKey.trim().length > 0)

  const pushBlocked = busy || !config.bark.enabled || !config.bark.deviceKey.configured
  const browserBlocked = busy || !config.browser.enabled || snapshot.permission !== 'granted'
  const allEventsOff = NOTIFICATION_KINDS.every((kind) => !config.events[kind].enabled)

  const onMasterChange = (next: boolean): void => {
    if (next) {
      const remembered = lastChannels.current
      // Restoring a browser channel needs the same gesture-bound prompt as its switch.
      if (remembered.browser && snapshot.permission === 'default') void model.requestPermission()
      save({
        browser: { enabled: remembered.browser },
        bark: { enabled: remembered.bark && config.bark.deviceKey.configured },
      })
      return
    }
    lastChannels.current = { browser: config.browser.enabled, bark: config.bark.enabled }
    save({ browser: { enabled: false }, bark: { enabled: false } })
  }

  const onBrowserToggle = (next: boolean): void => {
    // The permission prompt only opens inside the gesture, so ask before awaiting.
    if (next && snapshot.permission === 'default') void model.requestPermission()
    save({ browser: { enabled: next } })
  }

  const onVolumeCommit = (): void => {
    if (volumeDraft === null || volumeDraft === storedVolume) return
    save({ browser: { volume: volumeDraft / 100 } })
  }

  const commitConnection = async (): Promise<void> => {
    const bark: Record<string, string> = {}
    if (drafts.serverUrl !== undefined) bark['serverUrl'] = normalizeServerUrl(drafts.serverUrl)
    // An empty key means "keep the stored one"; erasing is the explicit button.
    if (drafts.deviceKey !== undefined && drafts.deviceKey.trim().length > 0) bark['deviceKey'] = drafts.deviceKey.trim()
    if (drafts.group !== undefined && drafts.group.trim().length > 0) bark['group'] = drafts.group.trim()
    if (drafts.baseUrl !== undefined) bark['baseUrl'] = drafts.baseUrl.trim()
    await model.save({ bark })
    if (model.getSnapshot().error === null) setDrafts({})
  }

  return (
    <div className="dn-section">
      <header className="dn-header">
        <h2 className="dn-title">{t('page.title')}</h2>
        <p className="dn-intro">{t('page.intro')}</p>
        {masterOn ? null : <p className="dn-readonly">{t('empty.noChannel')}</p>}
        {snapshot.notice === null ? null : (
          <p className="dn-notice dn-notice--success" role="status">
            {noticeText(snapshot.notice)}
          </p>
        )}
      </header>

      {snapshot.error === null ? null : <ErrorBar text={snapshot.error} onRetry={() => void model.refresh()} />}

      <section className="dn-block">
        <div className="dn-card">
          <SwitchRow
            title={t('master.switch')}
            description={t('master.desc')}
            checked={masterOn}
            disabled={busy}
            onChange={onMasterChange}
          />
          <div className="dn-indent">
            <Field label={t('browser.timing')} hint={t('browser.timingHint')}>
              <Segmented<CurrentSessionMode>
                label={t('browser.timing')}
                value={config.browser.currentSessionMode}
                options={MODE_OPTIONS}
                disabled={disabled}
                onChange={(mode) => save({ browser: { currentSessionMode: mode } })}
              />
            </Field>
            <SwitchRow
              title={t('subagent.switch')}
              description={t('subagent.hint')}
              checked={config.notifySubagents}
              disabled={disabled}
              onChange={(next) => save({ notifySubagents: next })}
            />
          </div>
        </div>
      </section>

      <Block title={t('channel.title')}>
        <div className="dn-card">
          <div className="dn-channel">
            <div className="dn-channelHead">
              <div className="dn-rowText">
                <span className="dn-rowTitle">{t('browser.switch')}</span>
                <span className="dn-rowDesc">{t('browser.desc')}</span>
              </div>
              <div className="dn-rowAside">
                <Tag tone={snapshot.permission === 'granted' ? 'neutral' : 'quiet'}>{permissionLabel(snapshot.permission)}</Tag>
                <Switch
                  label={t('browser.switch')}
                  checked={config.browser.enabled}
                  disabled={busy}
                  onChange={onBrowserToggle}
                />
              </div>
            </div>
            {config.browser.enabled ? (
              <div className="dn-channelBody">
                <Field label={t('sound.volume')} hint={t('sound.volumeHint')}>
                  <div className="dn-volumeRow">
                    <input
                      className="dn-range"
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      aria-label={t('sound.volume')}
                      value={volume}
                      disabled={busy}
                      onChange={(event) => setVolumeDraft(Number(event.target.value))}
                      onPointerUp={onVolumeCommit}
                      onKeyUp={onVolumeCommit}
                      onBlur={onVolumeCommit}
                    />
                    <span className="dn-volumeValue">{t('sound.volumeValue', { value: volume })}</span>
                  </div>
                </Field>
                {snapshot.permission === 'denied' ? (
                  <div className="dn-field">
                    <p className="dn-hint">{t('browser.deniedHint')}</p>
                    <Button onClick={() => void model.requestPermission()}>{t('browser.recheck')}</Button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="dn-channelSep" />

          <div className="dn-channel">
            <div className="dn-channelHead">
              <div className="dn-rowText">
                <span className="dn-rowTitle">{t('bark.switch')}</span>
                <span className="dn-rowDesc">{t('bark.desc')}</span>
              </div>
              <div className="dn-rowAside">
                <Tag tone={config.bark.deviceKey.configured ? 'neutral' : 'quiet'}>
                  {config.bark.deviceKey.configured ? t('secret.set') : t('secret.unset')}
                </Tag>
                <Switch
                  label={t('bark.switch')}
                  checked={config.bark.enabled}
                  disabled={busy}
                  onChange={(next) => save({ bark: { enabled: next } })}
                />
              </div>
            </div>
            {config.bark.enabled ? (
              <div className="dn-channelBody">
                <Field label={t('bark.serverUrl')} hint={t('bark.serverUrlHint')}>
                  <input
                    className={serverUrlInvalid ? 'dn-input dn-invalid' : 'dn-input'}
                    value={serverUrl}
                    placeholder="https://api.day.app"
                    spellCheck={false}
                    onChange={(event) => edit({ serverUrl: event.target.value })}
                    onBlur={commitConnection}
                  />
                </Field>
                <Field label={t('bark.deviceKey')} hint={t('bark.deviceKeyHint')}>
                  <div className="dn-row">
                    <input
                      className="dn-input"
                      type="password"
                      value={drafts.deviceKey ?? ''}
                      placeholder={config.bark.deviceKey.configured ? config.bark.deviceKey.masked : t('secret.unset')}
                      spellCheck={false}
                      autoComplete="off"
                      onChange={(event) => edit({ deviceKey: event.target.value })}
                      onBlur={commitConnection}
                    />
                    {config.bark.deviceKey.configured ? (
                      <Button
                        onClick={() => {
                          edit({ deviceKey: undefined })
                          save({ bark: { deviceKey: null } })
                        }}
                      >
                        {t('secret.clear')}
                      </Button>
                    ) : null}
                  </div>
                </Field>
                <Field label={t('bark.group')} hint={t('bark.groupHint')}>
                  <input
                    className="dn-input"
                    value={group}
                    onChange={(event) => edit({ group: event.target.value })}
                    onBlur={commitConnection}
                  />
                </Field>
                <Field label={t('bark.baseUrl')} hint={t('bark.baseUrlHint')}>
                  <input
                    className={baseUrlInvalid ? 'dn-input dn-invalid' : 'dn-input'}
                    value={baseUrl}
                    placeholder="http://127.0.0.1:3080"
                    spellCheck={false}
                    onChange={(event) => edit({ baseUrl: event.target.value })}
                    onBlur={commitConnection}
                  />
                </Field>
                <div className="dn-actions">
                  <Button variant="save" disabled={busy || !dirty || serverUrlInvalid || baseUrlInvalid} onClick={() => void commitConnection()}>
                    {busy ? t('form.saving') : t('form.save')}
                  </Button>
                  {dirty ? (
                    <Button variant="ghost" disabled={busy} onClick={() => setDrafts({})}>
                      {t('form.discard')}
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </Block>

      <Block title={t('events.title')}>
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
                  onChange={(next) => save({ events: { [event.kind]: { enabled: next } } })}
                />
                <SelectMenu<SoundId>
                  label={t('sound.tableLocal')}
                  value={config.events[event.kind].sound}
                  options={SOUND_OPTIONS}
                  disabled={disabled || !config.browser.enabled}
                  onChange={(sound) => save({ events: { [event.kind]: { sound } } })}
                />
                <SelectMenu<string>
                  label={t('sound.tableBark')}
                  value={config.events[event.kind].barkSound}
                  options={BARK_OPTIONS}
                  disabled={disabled || !config.bark.enabled}
                  onChange={(barkSound) => save({ events: { [event.kind]: { barkSound } } })}
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
      </Block>

      <Block title={t('status.title')}>
        <div className="dn-card">
          <div className="dn-stack">
            <div className="dn-statusLine">
              <StateDot state={snapshot.permission === 'granted' ? 'done' : 'idle'} />
              <span className="dn-rowTitle">{t('status.browserChannel')}</span>
              <Button disabled={browserBlocked} title={browserBlocked ? t('status.testBrowserBlocked') : undefined} onClick={() => void model.test('browser')}>
                {t('status.testBrowser')}
              </Button>
            </div>
            <div className="dn-statusLine">
              <StateDot state={config.bark.deviceKey.configured && config.bark.enabled ? 'done' : 'idle'} />
              <span className="dn-rowTitle">{t('status.barkChannel')}</span>
              <Button disabled={pushBlocked} title={pushBlocked ? t('status.testPushBlocked') : undefined} onClick={() => void model.test('bark')}>
                {t('status.testPush')}
              </Button>
            </div>
          </div>
        </div>
      </Block>

      <RepositoryInvite />
    </div>
  )
}

/** The repository this page ships from. */
const REPOSITORY_URL = 'https://github.com/yaorenliang/dsh-notify'

/**
 * A quiet line at the foot of the page.
 *
 * It sits after everything the page is for, because a settings page answers a
 * question the person already had; an ask for a star belongs at the end of that
 * visit, not between them and the switch they opened the page to find.
 */
function RepositoryInvite(): ReactNode {
  return (
    <p className="dn-invite">
      <span className="dn-invite__star" aria-hidden="true">★</span>
      <span>{t('repo.star')}</span>
      <a
        className="dn-invite__link"
        href={REPOSITORY_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t('repo.aria')}
      >
        <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false">
          <path
            fill="currentColor"
            d="M12 2.4a9.8 9.8 0 0 0-3.1 19.1c.5.1.7-.2.7-.5v-1.9c-2.8.6-3.4-1.2-3.4-1.2-.5-1.1-1.1-1.4-1.1-1.4-.9-.6.1-.6.1-.6 1 0 1.5 1 1.5 1 .9 1.5 2.3 1.1 2.9.8.1-.6.4-1.1.6-1.3-2.2-.3-4.6-1.1-4.6-4.9 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.8 1a9.5 9.5 0 0 1 5 0c1.9-1.3 2.8-1 2.8-1 .5 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.7 0 3.8-2.3 4.6-4.6 4.9.4.3.7.9.7 1.8V21c0 .3.2.6.7.5A9.8 9.8 0 0 0 12 2.4Z"
          />
        </svg>
        {t('repo.link')}
        <svg viewBox="0 0 16 16" width="10" height="10" aria-hidden="true" focusable="false" className="dn-invite__out">
          <path
            d="M6 3h7v7M13 3 7 9M11 9v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h3"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </a>
    </p>
  )
}

/** A titled group of cards. */
function Block({ title, children }: { readonly title: string; readonly children: ReactNode }): ReactNode {
  return (
    <section className="dn-block">
      <h3 className="dn-blockTitle">{title}</h3>
      {children}
    </section>
  )
}

/** A label, an optional hint, and one control. */
function Field({ label, hint, children }: { readonly label: string; readonly hint?: string | undefined; readonly children: ReactNode }): ReactNode {
  return (
    <div className="dn-field">
      <div className="dn-fieldHead">
        <span className="dn-label">{label}</span>
        {hint === undefined ? null : <span className="dn-hint">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

/** A boolean row: title, description, switch. */
function SwitchRow(props: {
  readonly title: string
  readonly description: string
  readonly checked: boolean
  readonly disabled: boolean
  readonly onChange: (next: boolean) => void
}): ReactNode {
  return (
    <div className="dn-rowBlock">
      <div className="dn-rowText">
        <span className="dn-rowTitle">{props.title}</span>
        <span className="dn-rowDesc">{props.description}</span>
      </div>
      <Switch label={props.title} checked={props.checked} disabled={props.disabled} onChange={props.onChange} />
    </div>
  )
}

/** The failure bar with its retry action. */
function ErrorBar({ text, onRetry }: { readonly text: string; readonly onRetry: () => void }): ReactNode {
  return (
    <div className="dn-errorBar" role="alert">
      <span className="dn-errorBar__text">{text}</span>
      <Button variant="ghost" onClick={onRetry}>
        {t('error.retry')}
      </Button>
    </div>
  )
}

/** The copy for a browser notification permission state. */
function permissionLabel(permission: Permission): string {
  switch (permission) {
    case 'granted':
      return t('browser.permission.granted')
    case 'denied':
      return t('browser.permission.denied')
    case 'unsupported':
      return t('browser.permission.unsupported')
    default:
      return t('browser.permission.default')
  }
}

/** The stored notice code as a sentence. */
function noticeText(notice: string): string {
  return notice === 'Saved' ? t('notice.saved') : t('notice.testSent')
}

/** Trim a trailing slash from a server root. */
function normalizeServerUrl(value: string): string {
  return value.trim().replace(/\/+$/, '')
}

/** Whether a string is an absolute http(s) address. */
function isHttpUrl(value: string): boolean {
  if (value.length === 0) return false
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}
