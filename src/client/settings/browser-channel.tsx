/**
 * The browser channel: its switch, the permission tag, the volume slider, and
 * the hint shown after a denial.
 */
import { useState } from 'react'
import type { ReactNode } from 'react'
import type { PublicConfig } from '../../core/config.ts'
import { t } from '../i18n.ts'
import type { Permission } from '../notify.ts'
import { Button, Switch, Tag } from './primitives.tsx'
import { Field } from './layout.tsx'

export function BrowserChannel(props: {
  readonly config: PublicConfig
  readonly permission: Permission
  readonly busy: boolean
  readonly onSave: (patch: unknown) => void
  readonly onRequestPermission: () => void
}): ReactNode {
  const { config, permission, busy, onSave, onRequestPermission } = props
  // The slider lives above the switch, so closing the channel does not discard the value in flight.
  const volume = useVolumeDraft(config, onSave)

  const onToggle = (next: boolean): void => {
    // The permission prompt only opens inside the gesture, so ask before awaiting.
    if (next && permission === 'default') onRequestPermission()
    onSave({ browser: { enabled: next } })
  }

  return (
    <div className="dn-channel">
      <div className="dn-channelHead">
        <div className="dn-rowText">
          <span className="dn-rowTitle">{t('browser.switch')}</span>
          <span className="dn-rowDesc">{t('browser.desc')}</span>
        </div>
        <div className="dn-rowAside">
          <Tag tone={permission === 'granted' ? 'neutral' : 'quiet'}>{permissionLabel(permission)}</Tag>
          <Switch
            label={t('browser.switch')}
            checked={config.browser.enabled}
            disabled={busy}
            onChange={onToggle}
          />
        </div>
      </div>
      {config.browser.enabled ? (
        <div className="dn-channelBody">
          <VolumeField value={volume.value} busy={busy} onChange={volume.onChange} onCommit={volume.onCommit} />
          {permission === 'default' ? (
            <div className="dn-field">
              <p className="dn-hint">{t('browser.defaultHint')}</p>
              <Button onClick={() => void onRequestPermission()}>{t('browser.request')}</Button>
            </div>
          ) : null}
          {permission === 'denied' ? (
            <div className="dn-field">
              <p className="dn-hint">{t('browser.deniedHint')}</p>
              <Button onClick={() => void onRequestPermission()}>{t('browser.recheck')}</Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

/** The volume in flight, committed on release instead of on every pixel. */
function useVolumeDraft(config: PublicConfig, onSave: (patch: unknown) => void): {
  readonly value: number
  readonly onChange: (value: number) => void
  readonly onCommit: () => void
} {
  const [draft, setDraft] = useState<number | null>(null)
  const stored = Math.round(config.browser.volume * 100)
  const value = draft ?? stored

  const onCommit = (): void => {
    if (draft === null || draft === stored) return
    onSave({ browser: { volume: draft / 100 } })
  }

  return { value, onChange: setDraft, onCommit }
}

/** The volume slider, committed on release instead of on every pixel. */
function VolumeField(props: {
  readonly value: number
  readonly busy: boolean
  readonly onChange: (value: number) => void
  readonly onCommit: () => void
}): ReactNode {
  return (
    <Field label={t('sound.volume')} hint={t('sound.volumeHint')}>
      <div className="dn-volumeRow">
        <input
          className="dn-range"
          type="range"
          min={0}
          max={100}
          step={1}
          aria-label={t('sound.volume')}
          value={props.value}
          disabled={props.busy}
          onChange={(event) => props.onChange(Number(event.target.value))}
          onPointerUp={props.onCommit}
          onKeyUp={props.onCommit}
          onBlur={props.onCommit}
        />
        <span className="dn-volumeValue">{t('sound.volumeValue', { value: props.value })}</span>
      </div>
    </Field>
  )
}

/** The phone channel: its switch and, while it is on, the connection form. */

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