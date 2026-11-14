/**
 * The "Settings → Notifications" page.
 *
 * One page, one configuration. The master switch and the two quieting rules sit
 * at the top, because they answer the only question that matters before the
 * plumbing does: when am I willing to be interrupted? Each channel then folds
 * open exactly when it is on, so the page carries no disabled furniture.
 *
 * The sections themselves live next to this file; this module is the table of
 * contents plus the two things only the page itself owns: the store subscription
 * and the header.
 */
import { useEffect, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import type { PublicConfig } from '../../core/config.ts'
import { t } from '../i18n.ts'
import type { SettingsModel } from '../model.ts'
import type { Permission } from '../notify.ts'
import { injectStyles } from './styles.ts'
import { Block } from './layout.tsx'
import { PageHeading, LoadingPage, RepositoryInvite } from './page-chrome.tsx'
import { MasterRules } from './master-rules.tsx'
import { BrowserChannel } from './browser-channel.tsx'
import { BarkChannel } from './bark-channel.tsx'
import { DetailBlocks } from './event-tables.tsx'

/** What the page receives from its registration. */
export interface NotificationsSectionProps {
  /** The store the page reads and commands. */
  readonly model: SettingsModel
}

/**
 * The page.
 *
 * The snapshot is the only source of truth; the component keeps drafts for the
 * connection form and the volume slider, and nothing else.
 */
export function NotificationsSection({ model }: NotificationsSectionProps): ReactNode {
  const snapshot = useSyncExternalStore(model.subscribe, model.getSnapshot, model.getSnapshot)

  useEffect(() => {
    injectStyles()
  }, [])

  const config = snapshot.config
  const busy = snapshot.busy

  if (config === null) {
    return <LoadingPage busy={busy} error={snapshot.error} onRetry={() => void model.refresh()} />
  }

  const save = (patch: unknown): void => void model.save(patch)
  const masterOn = config.browser.enabled || config.bark.enabled
  const disabled = busy || !masterOn

  return (
    <div className="dn-section">
      <PageHeading
        masterOn={masterOn}
        notice={snapshot.notice}
        error={snapshot.error}
        onRetry={() => void model.refresh()}
      />

      <MasterRules
        config={config}
        permission={snapshot.permission}
        busy={busy}
        masterOn={masterOn}
        disabled={disabled}
        onSave={save}
        onRequestPermission={() => void model.requestPermission()}
      />

      <ChannelCards
        config={config}
        permission={snapshot.permission}
        busy={busy}
        onSave={save}
        onCommit={commitPatch(model)}
        onRequestPermission={() => void model.requestPermission()}
      />

      <DetailBlocks
        config={config}
        permission={snapshot.permission}
        busy={busy}
        disabled={disabled}
        onSave={save}
        onTest={(channel) => void model.test(channel)}
      />

      <RepositoryInvite />
    </div>
  )
}

/** The title, the ready notice, and the failure bar. */

function commitPatch(model: SettingsModel): (patch: unknown) => Promise<boolean> {
  return async (patch) => {
    await model.save(patch)
    return model.getSnapshot().error === null
  }
}

/** Both channels in one card, with the hairline the shell uses between rows. */
function ChannelCards(props: {
  readonly config: PublicConfig
  readonly permission: Permission
  readonly busy: boolean
  readonly onSave: (patch: unknown) => void
  readonly onCommit: (patch: unknown) => Promise<boolean>
  readonly onRequestPermission: () => void
}): ReactNode {
  const { config, permission, busy, onSave, onCommit, onRequestPermission } = props

  return (
    <Block title={t('channel.title')}>
      <div className="dn-card">
        <BrowserChannel
          config={config}
          permission={permission}
          busy={busy}
          onSave={onSave}
          onRequestPermission={onRequestPermission}
        />
        <div className="dn-channelSep" />
        <BarkChannel config={config} busy={busy} onSave={onSave} onCommit={onCommit} />
      </div>
    </Block>
  )
}

/** The two quieting rules that hang off the master switch. */