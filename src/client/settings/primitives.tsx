/**
 * The few controls the page needs, built from the same measurements as the
 * settings shell's primitives.
 *
 * They are local because a section slot cannot import the primitives package at
 * runtime; the numbers below are the measured ones (36x20 switch, 4px segment
 * padding, 34px field height, 12px radius) so the page reads as the same product.
 */
import { useEffect, useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'

/** A 36x20 track with a 16px thumb; the thumb travels the 16px the padding leaves. */
export interface SwitchProps {
  readonly checked: boolean
  /** Accessible name; the visible label lives next to the control. */
  readonly label: string
  readonly disabled?: boolean | undefined
  readonly onChange: (next: boolean) => void
}

/** One boolean, in the shell's switch language. */
export function Switch({ checked, label, disabled, onChange }: SwitchProps): ReactNode {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled === true}
      className={checked ? 'dn-switch dn-switch--on' : 'dn-switch'}
      onClick={() => onChange(!checked)}
    >
      <span className="dn-switch__thumb" />
    </button>
  )
}

/** One option of a segmented control or a select menu. */
export interface Choice<T extends string> {
  readonly value: T
  readonly label: string
}

/** The control used where the choices must stay visible. */
export interface SegmentedProps<T extends string> {
  readonly value: T
  readonly options: readonly Choice<T>[]
  readonly label: string
  readonly disabled?: boolean | undefined
  readonly onChange: (next: T) => void
}

/** A radio group drawn as the shell's segmented control. */
export function Segmented<T extends string>({ value, options, label, disabled, onChange }: SegmentedProps<T>): ReactNode {
  return (
    <div className="dn-segmented" role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          disabled={disabled === true}
          className="dn-segmented__tab"
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

/** A select whose trigger is the shell's 34px field and whose list is a popup. */
export interface SelectMenuProps<T extends string> {
  readonly value: T
  readonly options: readonly Choice<T>[]
  readonly label: string
  readonly disabled?: boolean | undefined
  readonly onChange: (next: T) => void
}

/**
 * A menu-backed field.
 *
 * The list closes on an outside press and on Escape, and the trigger holds focus
 * afterwards, so keyboard users never lose their place.
 */
export function SelectMenu<T extends string>({ value, options, label, disabled, onChange }: SelectMenuProps<T>): ReactNode {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement | null>(null)
  const trigger = useRef<HTMLButtonElement | null>(null)
  const listId = useId()

  useEffect(() => {
    if (!open) return undefined
    const onPointerDown = (event: MouseEvent): void => {
      if (root.current !== null && event.target instanceof Node && !root.current.contains(event.target)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      setOpen(false)
      trigger.current?.focus()
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const selected = options.find((option) => option.value === value)

  return (
    <div className="dn-select" ref={root}>
      <button
        type="button"
        ref={trigger}
        className="dn-select__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={label}
        disabled={disabled === true}
        onClick={() => setOpen((previous) => !previous)}
      >
        <span className="dn-select__value">{selected?.label ?? value}</span>
        <Chevron />
      </button>
      {open ? (
        <ul className="dn-select__popup" id={listId} role="menu" aria-label={label}>
          {options.map((option) => (
            <li key={option.value} role="none">
              <button
                type="button"
                role="menuitemradio"
                aria-checked={option.value === value}
                className="dn-select__item"
                onClick={() => {
                  setOpen(false)
                  trigger.current?.focus()
                  if (option.value !== value) onChange(option.value)
                }}
              >
                <span className="dn-select__value">{option.label}</span>
                {option.value === value ? <Check /> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

/** A capsule label; 'quiet' is the "not configured" tone, 'neutral' the resting one. */
export interface TagProps {
  readonly children: ReactNode
  readonly tone?: 'neutral' | 'quiet'
}

/** One small status capsule. */
export function Tag({ children, tone = 'neutral' }: TagProps): ReactNode {
  return <span className={'dn-tag dn-tag--' + tone}>{children}</span>
}

/** The dot in front of a status line. */
export interface StateDotProps {
  readonly state: 'done' | 'idle'
}

/** A colour-only dot; the text beside it carries the meaning. */
export function StateDot({ state }: StateDotProps): ReactNode {
  return <span className={'dn-dot dn-dot--' + state} aria-hidden="true" />
}

/** A small action, in the shell's outline, ghost, and save variants. */
export interface ButtonProps {
  readonly children: ReactNode
  readonly variant?: 'outline' | 'ghost' | 'save'
  readonly disabled?: boolean | undefined
  /** Native tooltip; used to explain why a disabled action is disabled. */
  readonly title?: string | undefined
  readonly onClick?: (() => void) | undefined
}

/** One action button. */
export function Button({ children, variant = 'outline', disabled, title, onClick }: ButtonProps): ReactNode {
  const suffix = variant === 'outline' ? '' : ' dn-button--' + variant
  return (
    <button type="button" className={'dn-button' + suffix} disabled={disabled === true} title={title} onClick={onClick}>
      {children}
    </button>
  )
}

/** The downward chevron of a select trigger. */
function Chevron(): ReactNode {
  return (
    <svg className="dn-select__chevron" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M3 4.5 6 7.5 9 4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** The check mark of the selected menu entry. */
function Check(): ReactNode {
  return (
    <svg className="dn-select__check" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M2.5 6.4 4.8 8.7 9.5 3.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
