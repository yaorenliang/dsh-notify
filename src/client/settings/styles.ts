/**
 * The settings page's stylesheet.
 *
 * The Host page is a slot inside the DSH settings shell, so the rules only
 * describe the page's own rhythm: no panel, no mask, no page padding. Every
 * colour is an alias token, so light and dark themes both resolve through the
 * theme's own values instead of a literal that would freeze one of them.
 *
 * The rules are written in cascade order across the modules next to this file;
 * this module only joins them and injects the result once.
 */
import { PAGE } from './styles/page.ts'
import { FIELDS } from './styles/fields.ts'
import { BUTTONS } from './styles/buttons.ts'
import { PICKERS } from './styles/pickers.ts'
import { PANELS } from './styles/panels.ts'
import { RESPONSIVE } from './styles/responsive.ts'
import { CHANNELS } from './styles/channels.ts'

/** The id the injected stylesheet is addressed by. */
export const STYLE_ID = 'dsh-notify-styles'

/** One stylesheet, assembled in cascade order. */
const CSS = PAGE + FIELDS + BUTTONS + PICKERS + PANELS + RESPONSIVE + CHANNELS

/**
 * Inject the stylesheet once.
 *
 * The slot can mount, unmount, and mount again while the settings panel is open;
 * the id check keeps a second copy from stacking up and doubling every rule.
 */
export function injectStyles(): void {
  if (typeof document === 'undefined') return
  if (document.getElementById(STYLE_ID) !== null) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = CSS
  document.head.appendChild(style)
}
