/**
 * The phone channel: its switch, the connection form, and the secret field.
 *
 * The form keeps a draft per field so a half-typed key never reaches the Host;
 * the one commit that sends them is the save button or a field blur.
 */
import { useState } from 'react'
import type { ReactNode } from 'react'
import type { PublicConfig } from '../../core/config.ts'
import { t } from '../i18n.ts'
import { Button, Switch, Tag } from './primitives.tsx'
import { Field } from './layout.tsx'

/** Text a person types before it is committed. */
interface Drafts {
  readonly serverUrl?: string | undefined
  readonly deviceKey?: string | undefined
  readonly group?: string | undefined
  readonly baseUrl?: string | undefined
}

function barkPatch(drafts: Drafts): Record<string, string> {
  const bark: Record<string, string> = {}
  if (drafts.serverUrl !== undefined) bark['serverUrl'] = normalizeServerUrl(drafts.serverUrl)
  // An empty key means "keep the stored one"; erasing is the explicit button.
  if (drafts.deviceKey !== undefined && drafts.deviceKey.trim().length > 0) bark['deviceKey'] = drafts.deviceKey.trim()
  if (drafts.group !== undefined && drafts.group.trim().length > 0) bark['group'] = drafts.group.trim()
  if (drafts.baseUrl !== undefined) bark['baseUrl'] = drafts.baseUrl.trim()
  return bark
}

/** Whether any draft differs from the stored connection settings. */
function isBarkDirty(drafts: Drafts, config: PublicConfig): boolean {
  return (
    (drafts.serverUrl !== undefined && normalizeServerUrl(drafts.serverUrl) !== config.bark.serverUrl) ||
    (drafts.group !== undefined && drafts.group.trim() !== config.bark.group) ||
    (drafts.baseUrl !== undefined && drafts.baseUrl.trim() !== config.bark.baseUrl) ||
    (drafts.deviceKey !== undefined && drafts.deviceKey.trim().length > 0)
  )
}

/** The connection drafts, the values they override, and the one commit that sends them. */
export function useBarkDraft(config: PublicConfig, onCommit: (patch: unknown) => Promise<boolean>): {
  readonly drafts: Drafts
  readonly edit: (patch: Drafts) => void
  readonly discard: () => void
  readonly commitConnection: () => Promise<void>
  readonly dirty: boolean
  readonly serverUrl: string
  readonly baseUrl: string
  readonly serverUrlInvalid: boolean
  readonly baseUrlInvalid: boolean
} {
  const [drafts, setDrafts] = useState<Drafts>({})
  const edit = (patch: Drafts): void => setDrafts((previous) => ({ ...previous, ...patch }))

  const serverUrl = drafts.serverUrl ?? config.bark.serverUrl
  const baseUrl = drafts.baseUrl ?? config.bark.baseUrl
  const serverUrlInvalid = !isHttpUrl(normalizeServerUrl(serverUrl))
  const baseUrlInvalid = baseUrl.trim().length > 0 && !isHttpUrl(baseUrl.trim())
  const dirty = isBarkDirty(drafts, config)

  const commitConnection = async (): Promise<void> => {
    if (await onCommit({ bark: barkPatch(drafts) })) setDrafts({})
  }

  return { drafts, edit, discard: () => setDrafts({}), commitConnection, dirty, serverUrl, baseUrl, serverUrlInvalid, baseUrlInvalid }
}

/** The draft store the page keeps alive across the channel's switch. */
type BarkDraft = ReturnType<typeof useBarkDraft>

/** What both halves of the phone channel need from the page. */
interface BarkSectionProps {
  readonly config: PublicConfig
  readonly busy: boolean
  readonly onSave: (patch: unknown) => void
  readonly draft: BarkDraft
}

/** The phone channel: its switch and, while it is on, the connection form. */
export function BarkChannel(props: BarkSectionProps): ReactNode {
  const { config, busy, onSave, draft } = props

  return (
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
            onChange={(next) => onSave({ bark: { enabled: next } })}
          />
        </div>
      </div>
      {config.bark.enabled ? (
        <BarkConnectionForm config={config} busy={busy} onSave={onSave} draft={draft} />
      ) : null}
    </div>
  )
}

/** The connection settings, held as drafts until the Host accepts them. */
function BarkConnectionForm(props: BarkSectionProps): ReactNode {
  const { config, busy, onSave, draft } = props
  const { drafts, edit, commitConnection, dirty, serverUrl, baseUrl, serverUrlInvalid, baseUrlInvalid } = draft

  return (
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
      <BarkKeyFields
        config={config}
        drafts={drafts}
        onEdit={edit}
        onSave={onSave}
        onCommit={commitConnection}
      />
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
      <BarkActions
        busy={busy}
        dirty={dirty}
        blocked={serverUrlInvalid || baseUrlInvalid}
        onSave={() => void commitConnection()}
        onDiscard={draft.discard}
      />
    </div>
  )
}

/** The device key (with its erase button) and the notification group. */
function BarkKeyFields(props: {
  readonly config: PublicConfig
  readonly drafts: Drafts
  readonly onEdit: (patch: Drafts) => void
  readonly onSave: (patch: unknown) => void
  readonly onCommit: () => Promise<void>
}): ReactNode {
  const { config, drafts, onEdit, onSave, onCommit } = props

  return (
    <>
      <Field label={t('bark.deviceKey')} hint={t('bark.deviceKeyHint')}>
        <div className="dn-row">
          <input
            className="dn-input"
            type="password"
            value={drafts.deviceKey ?? ''}
            placeholder={config.bark.deviceKey.configured ? config.bark.deviceKey.masked : t('secret.unset')}
            spellCheck={false}
            autoComplete="off"
            onChange={(event) => onEdit({ deviceKey: event.target.value })}
            onBlur={onCommit}
          />
          {config.bark.deviceKey.configured ? (
            <Button
              onClick={() => {
                onEdit({ deviceKey: undefined })
                onSave({ bark: { deviceKey: null } })
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
          value={drafts.group ?? config.bark.group}
          onChange={(event) => onEdit({ group: event.target.value })}
          onBlur={onCommit}
        />
      </Field>
    </>
  )
}

/** Save and discard, disabled exactly while the drafts cannot be sent. */
function BarkActions(props: {
  readonly busy: boolean
  readonly dirty: boolean
  readonly blocked: boolean
  readonly onSave: () => void
  readonly onDiscard: () => void
}): ReactNode {
  return (
    <div className="dn-actions">
      <Button variant="save" disabled={props.busy || !props.dirty || props.blocked} onClick={props.onSave}>
        {props.busy ? t('form.saving') : t('form.save')}
      </Button>
      {props.dirty ? (
        <Button variant="ghost" disabled={props.busy} onClick={props.onDiscard}>
          {t('form.discard')}
        </Button>
      ) : null}
    </div>
  )
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