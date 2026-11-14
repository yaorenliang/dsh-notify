/**
 * The master switch and the two quieting rules it owns.
 *
 * These answer the only question worth asking before the plumbing: when is the
 * person willing to be interrupted at all?
 */
import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import type { PublicConfig } from '../../core/config.ts'
import type { CurrentSessionMode } from '../../core/policy.ts'
import { t } from '../i18n.ts'
import type { MessageKey } from '../i18n.ts'
import type { Permission } from '../notify.ts'
import { Segmented } from './primitives.tsx'
import { Field, SwitchRow } from './layout.tsx'

/** The three answers to "may the session on screen still alert?". */
const MODES: readonly { readonly value: CurrentSessionMode; readonly label: MessageKey }[] = [
  { value: 'hidden', label: 'timing.hidden' },
  { value: 'unfocused', label: 'timing.unfocused' },
  { value: 'always', label: 'timing.always' },
]

const MODE_OPTIONS = MODES.map((mode) => ({ value: mode.value, label: t(mode.label) }))

export function MasterRules(props: {
  readonly config: PublicConfig
  readonly permission: Permission
  readonly busy: boolean
  readonly masterOn: boolean
  readonly disabled: boolean
  readonly onSave: (patch: unknown) => void
  readonly onRequestPermission: () => void
}): ReactNode {
  const { config, permission, busy, masterOn, disabled, onSave, onRequestPermission } = props
  const lastChannels = useRef<{ browser: boolean; bark: boolean }>({ browser: false, bark: false })

  // Remember what "on" looked like, so the master switch can restore it.
  useEffect(() => {
    if (config.browser.enabled || config.bark.enabled) {
      lastChannels.current = { browser: config.browser.enabled, bark: config.bark.enabled }
    }
  }, [config])

  const onChange = (next: boolean): void => {
    if (next) {
      const remembered = lastChannels.current
      // Restoring a browser channel needs the same gesture-bound prompt as its switch.
      if (remembered.browser && permission === 'default') onRequestPermission()
      onSave({
        browser: { enabled: remembered.browser },
        bark: { enabled: remembered.bark && config.bark.deviceKey.configured },
      })
      return
    }
    lastChannels.current = { browser: config.browser.enabled, bark: config.bark.enabled }
    onSave({ browser: { enabled: false }, bark: { enabled: false } })
  }

  return (
    <section className="dn-block">
      <div className="dn-card">
        <SwitchRow
          title={t('master.switch')}
          description={t('master.desc')}
          checked={masterOn}
          disabled={busy}
          onChange={onChange}
        />
        <QuietRules config={config} disabled={disabled} onSave={onSave} />
      </div>
    </section>
  )
}

/** Save a patch and report whether the Host accepted it, for the connection form. */

export function QuietRules(props: {
  readonly config: PublicConfig
  readonly disabled: boolean
  readonly onSave: (patch: unknown) => void
}): ReactNode {
  return (
    <div className="dn-indent">
      <Field label={t('browser.timing')} hint={t('browser.timingHint')}>
        <Segmented<CurrentSessionMode>
          label={t('browser.timing')}
          value={props.config.browser.currentSessionMode}
          options={MODE_OPTIONS}
          disabled={props.disabled}
          onChange={(mode) => props.onSave({ browser: { currentSessionMode: mode } })}
        />
      </Field>
      <SwitchRow
        title={t('subagent.switch')}
        description={t('subagent.hint')}
        checked={props.config.notifySubagents}
        disabled={props.disabled}
        onChange={(next) => props.onSave({ notifySubagents: next })}
      />
    </div>
  )
}

/** The patch a commit sends: only the fields a person actually touched. */
