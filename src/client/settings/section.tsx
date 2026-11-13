/**
 * The "Settings → Notifications" page.
 *
 * One page, six blocks, one configuration. Booleans and choices write straight
 * to the Host because a switch is already a decision; the Bark connection group
 * is a form because a half-typed server URL should never be stored. Every string
 * comes from the i18n module, and every colour from a theme alias, so the page
 * reads as part of the settings shell rather than a plugin island.
 */
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import { DEFAULT_CONFIG, NOTIFICATION_KINDS } from '../../core/config.ts'
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
  readonly icon?: string | undefined
  readonly group?: string | undefined
  readonly prefix?: string | undefined
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

/** The built-in browser sounds, in the order the configuration lists them. */
const SOUNDS_ORDER: readonly SoundId[] = ['chime', 'fault', 'pop', 'alert']

/** Copy for each built-in browser sound. */
const SOUND_LABELS: Readonly<Record<SoundId, MessageKey>> = {
  chime: 'sound.browser.chime',
  fault: 'sound.browser.fault',
  pop: 'sound.browser.pop',
  alert: 'sound.browser.alert',
}

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
  const lastChannels = useRef<{ browser: boolean; bark: boolean }>({ browser: true, bark: false })

  // The model keeps its last notice; the page shows it for a moment only.
  const [visibleNotice, setVisibleNotice] = useState<string | null>(null)

  useEffect(() => {
    injectStyles()
  }, [])

  useEffect(() => {
    if (snapshot.notice === null) {
      setVisibleNotice(null)
      return undefined
    }
    setVisibleNotice(snapshot.notice)
    const timer = setTimeout(() => setVisibleNotice(null), 1600)
    return () => clearTimeout(timer)
  }, [snapshot.notice])

  const config = snapshot.config
  const state = snapshot.state
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

  const edit = (patch: Drafts): void => {
    setDrafts((previous) => ({ ...previous, ...patch }))
  }

  const save = (patch: unknown): void => void model.save(patch)

  const masterOn = config.browser.enabled || config.bark.enabled
  // With both channels off the rest has nothing to act on; the master stays live.
  const locked = !masterOn
  const disabled = busy || locked

  const storedVolume = Math.round(config.browser.volume * 100)
  const volume = volumeDraft ?? storedVolume

  const serverUrl = drafts.serverUrl ?? config.bark.serverUrl
  const icon = drafts.icon ?? config.bark.icon
  const group = drafts.group ?? config.bark.group
  const baseUrl = drafts.baseUrl ?? config.baseUrl
  const serverUrlInvalid = !isHttpUrl(normalizeServerUrl(serverUrl))
  const iconInvalid = icon.trim().length > 0 && !isHttpUrl(icon.trim())
  const baseUrlInvalid = baseUrl.trim().length > 0 && !isHttpUrl(baseUrl.trim())
  const dirty = isConnectionDirty(config, drafts)

  const masterDisabled = busy
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

  const onEventToggle = (kind: NotificationKind, next: boolean): void => {
    save({ events: { [kind]: { enabled: next } } })
  }

  const onSoundChange = (kind: NotificationKind, sound: SoundId): void => {
    save({ events: { [kind]: { sound } } })
  }

  const onBarkSoundChange = (kind: NotificationKind, barkSound: string): void => {
    save({ events: { [kind]: { barkSound } } })
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
    if (drafts.icon !== undefined) bark['icon'] = drafts.icon.trim()
    if (drafts.group !== undefined && drafts.group.trim().length > 0) bark['group'] = drafts.group.trim()
    await model.save({ bark })
    if (model.getSnapshot().error === null) setDrafts({})
  }

  const commitPrefix = (): void => {
    const value = drafts.prefix
    if (value === undefined) return
    const next = value.slice(0, 12)
    edit({ prefix: undefined })
    if (next !== config.prefix) void model.save({ prefix: next })
  }

  const commitBaseUrl = (): void => {
    const value = drafts.baseUrl
    if (value === undefined) return
    const next = value.trim()
    edit({ baseUrl: undefined })
    if (next !== config.baseUrl) void model.save({ baseUrl: next })
  }

  return (
    <div className="dn-section">
      <header className="dn-header">
        <h2 className="dn-title">{t('page.title')}</h2>
        <p className="dn-intro">{t('page.intro')}</p>
        {masterOn ? null : <p className="dn-readonly">{t('empty.noChannel')}</p>}
        {visibleNotice === null ? null : (
          <p className="dn-notice dn-notice--success" role="status">
            {noticeText(visibleNotice)}
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
            disabled={masterDisabled}
            onChange={onMasterChange}
          />
        </div>
      </section>

      <Block title={t('channel.title')}>
        <div className="dn-card">
          <div className="dn-stack">
            <div className="dn-rowBlock">
              <SwitchRow
                title={t('browser.switch')}
                description={t('browser.desc')}
                checked={config.browser.enabled}
                disabled={disabled}
                onChange={onBrowserToggle}
              />
              <div className="dn-statusLine">
                <StateDot state={permissionDot(snapshot.permission)} />
                <span>{t(permissionKey(snapshot.permission))}</span>
              </div>
            </div>

            <Field label={t('browser.timing')} hint={t('browser.timingHint')}>
              <Segmented<CurrentSessionMode>
                label={t('browser.timing')}
                value={config.browser.currentSessionMode}
                options={MODES.map((mode) => ({ value: mode.value, label: t(mode.label) }))}
                disabled={disabled}
                onChange={(next) => save({ browser: { currentSessionMode: next } })}
              />
            </Field>

            {snapshot.permission !== 'denied' ? null : (
              <ErrorBar
                text={t('browser.deniedHint')}
                action={t('browser.recheck')}
                onRetry={() => void model.refresh()}
              />
            )}

            <div className="dn-rowBlock">
              <SwitchRow
                title={t('bark.switch')}
                description={t('bark.desc')}
                checked={config.bark.enabled}
                disabled={disabled}
                onChange={(next) => save({ bark: { enabled: next } })}
              />
            </div>

            <Field
              label={t('bark.serverUrl')}
              hint={t('bark.serverUrlHint')}
              invalid={serverUrlInvalid ? t('invalid.url') : null}
            >
              <input
                className="dn-input"
                type="url"
                inputMode="url"
                aria-label={t('bark.serverUrl')}
                aria-invalid={serverUrlInvalid}
                placeholder={DEFAULT_CONFIG.bark.serverUrl}
                value={serverUrl}
                disabled={disabled}
                onChange={(event) => edit({ serverUrl: event.target.value })}
              />
            </Field>

            <Field
              label={t('bark.deviceKey')}
              hint={t('bark.deviceKeyHint')}
              badge={
                <Tag tone={config.bark.deviceKey.configured ? 'neutral' : 'quiet'}>
                  {config.bark.deviceKey.configured ? t('secret.set') : t('secret.unset')}
                </Tag>
              }
              action={
                config.bark.deviceKey.configured ? (
                  <Button
                    variant="ghost"
                    disabled={disabled}
                    onClick={() => save({ bark: { deviceKey: null } })}
                  >
                    {t('secret.clear')}
                  </Button>
                ) : null
              }
            >
              <input
                className="dn-input"
                type="password"
                autoComplete="new-password"
                aria-label={t('bark.deviceKey')}
                placeholder={config.bark.deviceKey.configured ? config.bark.deviceKey.masked : ''}
                value={drafts.deviceKey ?? ''}
                disabled={disabled}
                onChange={(event) => edit({ deviceKey: event.target.value })}
              />
            </Field>

            <Field label={t('bark.icon')} hint={t('bark.iconHint')} invalid={iconInvalid ? t('invalid.url') : null}>
              <input
                className="dn-input"
                type="url"
                inputMode="url"
                aria-label={t('bark.icon')}
                aria-invalid={iconInvalid}
                value={icon}
                disabled={disabled}
                onChange={(event) => edit({ icon: event.target.value })}
              />
            </Field>

            <Field label={t('bark.group')} hint={t('bark.groupHint')}>
              <input
                className="dn-input"
                type="text"
                aria-label={t('bark.group')}
                placeholder={DEFAULT_CONFIG.bark.group}
                value={group}
                disabled={disabled}
                onChange={(event) => edit({ group: event.target.value })}
              />
            </Field>
          </div>

          <div className="dn-footer">
            <div className="dn-footer__actions">
              {dirty ? (
                <Button variant="ghost" disabled={busy} onClick={() => setDrafts({})}>
                  {t('form.discard')}
                </Button>
              ) : null}
              <Button
                variant="save"
                disabled={!dirty || busy || serverUrlInvalid || iconInvalid}
                onClick={() => void commitConnection()}
              >
                {busy ? t('form.saving') : t('form.save')}
              </Button>
            </div>
          </div>
        </div>
      </Block>

      <Block title={t('events.title')}>
        <div className="dn-card">
          <div className="dn-stack">
            {allEventsOff ? <p className="dn-warn">{t('events.empty')}</p> : null}
            {EVENTS.map((event) => (
              <SwitchRow
                key={event.kind}
                title={t(event.title)}
                description={t(event.description)}
                checked={config.events[event.kind].enabled}
                disabled={disabled}
                onChange={(next) => onEventToggle(event.kind, next)}
              />
            ))}
          </div>
        </div>
      </Block>

      <Block title={t('sound.title')}>
        <div className="dn-card">
          <div className="dn-stack">
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
                  disabled={disabled}
                  onChange={(event) => setVolumeDraft(Number(event.target.value))}
                  onPointerUp={onVolumeCommit}
                  onKeyUp={onVolumeCommit}
                  onBlur={onVolumeCommit}
                />
                <span className="dn-volumeValue">{t('sound.volumeValue', { value: volume })}</span>
              </div>
            </Field>

            <div className="dn-sound">
              <div className="dn-sound__head">
                <span>{t('sound.tableEvent')}</span>
                <span>{t('sound.tableLocal')}</span>
                <span>{t('sound.tableBark')}</span>
                <span />
              </div>
              {EVENTS.map((event) => (
                <div className="dn-sound__row" key={event.kind}>
                  <span className="dn-sound__name">{t(event.title)}</span>
                  <SelectMenu<SoundId>
                    label={t('sound.tableLocal')}
                    value={config.events[event.kind].sound}
                    options={SOUNDS_ORDER.map((sound) => ({ value: sound, label: t(SOUND_LABELS[sound]) }))}
                    disabled={disabled}
                    onChange={(next) => onSoundChange(event.kind, next)}
                  />
                  <SelectMenu<string>
                    label={t('sound.tableBark')}
                    value={config.events[event.kind].barkSound}
                    options={BARK_SOUNDS.map((sound) => ({ value: sound.value, label: t(sound.label) }))}
                    disabled={disabled}
                    onChange={(next) => onBarkSoundChange(event.kind, next)}
                  />
                  <Button
                    variant="ghost"
                    disabled={disabled}
                    title={t('sound.previewTitle', { name: t(SOUND_LABELS[config.events[event.kind].sound]) })}
                    onClick={() => play(config.events[event.kind].sound, volume / 100)}
                  >
                    {t('sound.preview')}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Block>

      <Block title={t('status.title')}>
        <div className="dn-card">
          <div className="dn-stack">
            <div className="dn-rowBlock">
              <StatusRow label={t('status.barkChannel')} value={readyText(state === null ? null : state.channels.bark)} />
              <StatusRow
                label={t('status.browserChannel')}
                value={readyText(state === null ? null : state.channels.browser)}
              />
              <StatusRow label={t('status.permission')} value={t(permissionKey(snapshot.permission))} />
              <StatusRow
                label={t('status.browsers')}
                value={state === null ? t('status.unknown') : String(state.browsers)}
              />
            </div>
            <div className="dn-actions">
              <Button
                disabled={pushBlocked}
                title={pushBlocked ? t('status.testPushBlocked') : undefined}
                onClick={() => void model.test('bark')}
              >
                {t('status.testPush')}
              </Button>
              <Button
                disabled={browserBlocked}
                title={browserBlocked ? t('status.testBrowserBlocked') : undefined}
                onClick={() => void model.test('browser')}
              >
                {t('status.testBrowser')}
              </Button>
            </div>
          </div>
        </div>
      </Block>

      <Block title={t('advanced.title')}>
        <div className="dn-card">
          <div className="dn-stack">
            <SwitchRow
              title={t('advanced.subagents')}
              description={t('advanced.subagentsHint')}
              checked={config.notifySubagents}
              disabled={disabled}
              onChange={(next) => save({ notifySubagents: next })}
            />
            <Field label={t('advanced.prefix')} hint={t('advanced.prefixHint')}>
              <input
                className="dn-input"
                type="text"
                maxLength={12}
                aria-label={t('advanced.prefix')}
                value={drafts.prefix ?? config.prefix}
                disabled={disabled}
                onChange={(event) => edit({ prefix: event.target.value })}
                onBlur={commitPrefix}
              />
            </Field>
            <Field label={t('advanced.baseUrl')} hint={t('advanced.baseUrlHint')} invalid={baseUrlInvalid ? t('invalid.url') : null}>
              <input
                className="dn-input"
                type="url"
                inputMode="url"
                aria-label={t('advanced.baseUrl')}
                aria-invalid={baseUrlInvalid}
                value={baseUrl}
                disabled={disabled}
                onChange={(event) => edit({ baseUrl: event.target.value })}
                onBlur={commitBaseUrl}
              />
            </Field>
          </div>
        </div>
      </Block>
    </div>
  )
}

/** A block: heading plus whatever the block owns. */
function Block({ title, children }: { readonly title: string; readonly children: ReactNode }): ReactNode {
  return (
    <section className="dn-block">
      <h3 className="dn-blockTitle">{title}</h3>
      {children}
    </section>
  )
}

/** A title, an explanation, and a switch on the right. */
function SwitchRow({
  title,
  description,
  checked,
  disabled,
  onChange,
}: {
  readonly title: string
  readonly description?: string | undefined
  readonly checked: boolean
  readonly disabled?: boolean | undefined
  readonly onChange: (next: boolean) => void
}): ReactNode {
  return (
    <div className="dn-row">
      <div className="dn-rowText">
        <span className="dn-rowTitle">{title}</span>
        {description === undefined ? null : <span className="dn-rowDesc">{description}</span>}
      </div>
      <Switch checked={checked} label={title} disabled={disabled} onChange={onChange} />
    </div>
  )
}

/** One labelled control, with the label's badges and the field's own messages. */
function Field({
  label,
  hint,
  invalid,
  badge,
  action,
  children,
}: {
  readonly label: string
  readonly hint?: string | null | undefined
  readonly invalid?: string | null | undefined
  readonly badge?: ReactNode
  readonly action?: ReactNode
  readonly children: ReactNode
}): ReactNode {
  return (
    <div className="dn-field">
      <div className="dn-fieldHead">
        <span className="dn-label">{label}</span>
        {badge}
        {action}
      </div>
      {children}
      {invalid === undefined || invalid === null ? null : <p className="dn-invalid">{invalid}</p>}
      {hint === undefined || hint === null ? null : <p className="dn-hint">{hint}</p>}
    </div>
  )
}

/** One read-only "name: value" line. */
function StatusRow({ label, value }: { readonly label: string; readonly value: string }): ReactNode {
  return (
    <div className="dn-kv">
      <span className="dn-kv__key">{label}</span>
      <span className="dn-kv__value">{value}</span>
    </div>
  )
}

/** One error line with its retry action. */
function ErrorBar({
  text,
  action,
  onRetry,
}: {
  readonly text: string
  readonly action?: string | undefined
  readonly onRetry: () => void
}): ReactNode {
  return (
    <div className="dn-errorBar">
      <span className="dn-errorBar__text" role="alert">
        {text}
      </span>
      <Button onClick={onRetry}>{action ?? t('error.retry')}</Button>
    </div>
  )
}

/** Trim a server URL and fall back to the documented default when empty. */
function normalizeServerUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, '')
  return trimmed.length === 0 ? DEFAULT_CONFIG.bark.serverUrl : trimmed
}

/** Accept only absolute http(s) addresses; everything else is a typo. */
function isHttpUrl(value: string): boolean {
  return /^https?:\/\/[^\s]+$/i.test(value)
}

/** True when the connection form holds something other than the stored values. */
function isConnectionDirty(config: PublicConfig, drafts: Drafts): boolean {
  if (drafts.serverUrl !== undefined && normalizeServerUrl(drafts.serverUrl) !== config.bark.serverUrl) return true
  if (drafts.deviceKey !== undefined && drafts.deviceKey.trim().length > 0) return true
  if (drafts.icon !== undefined && drafts.icon.trim() !== config.bark.icon) return true
  if (drafts.group !== undefined && drafts.group.trim().length > 0 && drafts.group.trim() !== config.bark.group) return true
  return false
}

/** The translation key for a permission state. */
function permissionKey(permission: Permission): MessageKey {
  switch (permission) {
    case 'granted':
      return 'browser.permission.granted'
    case 'default':
      return 'browser.permission.default'
    case 'denied':
      return 'browser.permission.denied'
    case 'unsupported':
      return 'browser.permission.unsupported'
  }
}

/** The dot colour for a permission state. */
function permissionDot(permission: Permission): 'done' | 'idle' | 'error' {
  if (permission === 'granted') return 'done'
  if (permission === 'denied') return 'error'
  return 'idle'
}

/** Host readiness as a word. */
function readyText(ready: boolean | null): string {
  if (ready === null) return t('status.unknown')
  return ready ? t('status.ready') : t('status.notReady')
}

/** The model reports English notices; the page speaks the reader's language. */
function noticeText(notice: string): string {
  if (notice === 'Saved') return t('notice.saved')
  if (notice.startsWith('Test sent')) return t('notice.testSent')
  return notice
}
