/**
 * The navigation icon for this section.
 *
 * The shell draws every settings icon from one hand-drawn set on a 16 or 17 unit
 * grid with a 1.5 stroke and `currentColor`, and falls back to a gear for ids it
 * does not know. This bell is drawn to the same grid and weight so the row reads
 * as part of the same family rather than as a borrowed glyph.
 */
import type { ReactNode } from 'react'

/** Props the settings shell passes to a navigation icon. */
export interface SectionIconProps {
  /** Edge length in pixels; the shell asks for 16. */
  readonly size?: number
}

/** The bell shown beside the section name. */
export function BellIcon({ size = 16 }: SectionIconProps): ReactNode {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 17 17"
      width={size}
      height={size}
      fill="none"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: 'block' }}
      aria-hidden="true"
    >
      <path d="M8.5 2.7C6.31 2.7 4.85 4.4 4.85 6.65V9.35L3.95 10.9H13.05L12.15 9.35V6.65C12.15 4.4 10.69 2.7 8.5 2.7Z" stroke="currentColor" />
      <path d="M7.25 12.35A1.3 1.3 0 0 0 9.75 12.35" stroke="currentColor" />
    </svg>
  )
}
