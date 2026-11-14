/**
 * The page's frame: its heading, its loading state, its failure bar, and the
 * quiet line at the foot.
 */
import type { ReactNode } from 'react'
import { t } from '../i18n.ts'
import { ErrorBar } from './layout.tsx'

export function PageHeading(props: {
  readonly masterOn: boolean
  readonly notice: string | null
  readonly error: string | null
  readonly onRetry: () => void
}): ReactNode {
  return (
    <>
      <header className="dn-header">
        <h2 className="dn-title">{t('page.title')}</h2>
        <p className="dn-intro">{t('page.intro')}</p>
        {props.masterOn ? null : <p className="dn-readonly">{t('empty.noChannel')}</p>}
        {props.notice === null ? null : (
          <p className="dn-notice dn-notice--success" role="status">
            {noticeText(props.notice)}
          </p>
        )}
      </header>

      {props.error === null ? null : <ErrorBar text={props.error} onRetry={props.onRetry} />}
    </>
  )
}

/** The page before its first configuration arrives. */
export function LoadingPage(props: { readonly busy: boolean; readonly error: string | null; readonly onRetry: () => void }): ReactNode {
  return (
    <div className="dn-section">
      <header className="dn-header">
        <h2 className="dn-title">{t('page.title')}</h2>
        <p className="dn-intro">{props.busy ? t('page.loading') : t('page.loadFailed')}</p>
      </header>
      {props.error === null ? null : <ErrorBar text={props.error} onRetry={props.onRetry} />}
      <div className="dn-skeleton" aria-hidden="true">
        <div className="dn-skeleton__line dn-skeleton__line--short" />
        <div className="dn-skeleton__line" />
        <div className="dn-skeleton__line" />
      </div>
    </div>
  )
}

/** The master switch and the two quieting rules it owns. */

/** The repository this page ships from. */
const REPOSITORY_URL = 'https://github.com/yaorenliang/dsh-notify'

/**
 * A quiet line at the foot of the page.
 *
 * It sits after everything the page is for, because a settings page answers a
 * question the person already had; an ask for a star belongs at the end of that
 * visit, not between them and the switch they opened the page to find.
 */
export function RepositoryInvite(): ReactNode {
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

/** The stored notice code as a sentence. */
function noticeText(notice: string): string {
  return notice === 'Saved' ? t('notice.saved') : t('notice.testSent')
}
