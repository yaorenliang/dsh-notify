/**
 * The small pieces every part of the page shares.
 *
 * They live apart from the page itself so each section imports one shape rather
 * than copying markup, and so the page file stays a table of contents.
 */
import type { ReactNode } from 'react'
import { t } from '../i18n.ts'
import { Button, Switch } from './primitives.tsx'

/** A titled group of cards. */
export function Block({ title, children }: { readonly title: string; readonly children: ReactNode }): ReactNode {
  return (
    <section className="dn-block">
      <h3 className="dn-blockTitle">{title}</h3>
      {children}
    </section>
  )
}

/** A label, an optional hint, and one control. */
export function Field({ label, hint, children }: { readonly label: string; readonly hint?: string | undefined; readonly children: ReactNode }): ReactNode {
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
export function SwitchRow(props: {
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
export function ErrorBar({ text, onRetry }: { readonly text: string; readonly onRetry: () => void }): ReactNode {
  return (
    <div className="dn-errorBar" role="alert">
      <span className="dn-errorBar__text">{text}</span>
      <Button variant="ghost" onClick={onRetry}>
        {t('error.retry')}
      </Button>
    </div>
  )
}
