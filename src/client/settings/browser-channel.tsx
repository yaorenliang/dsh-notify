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
          <VolumeField stored={Math.round(config.browser.volume * 100)} busy={busy} onCommit={(value) => onSave({ browser: { volume: value / 100 } })} />
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

/** The volume slider, committed on release instead of on every pixel. */
function VolumeField(props: {
  readonly stored: number
  readonly busy: boolean
  readonly onCommit: (value: number) => void
}): ReactNode {
  const [draft, setDraft] = useState<number | null>(null)
  const value = draft ?? props.stored

  const commit = (): void => {
    if (draft === null || draft === props.stored) return
    props.onCommit(draft)
  }

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
          value={value}
          disabled={props.busy}
          onChange={(event) => setDraft(Number(event.target.value))}
          onPointerUp={commit}
          onKeyUp={commit}
          onBlur={commit}
        />
        <span className="dn-volumeValue">{t('sound.volumeValue', { value })}</span>
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
