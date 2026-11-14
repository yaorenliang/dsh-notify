/**
 * The settings page's stylesheet.
 *
 * The Host page is a slot inside the DSH settings shell, so the rules only
 * describe the page's own rhythm: no panel, no mask, no page padding. Every
 * colour is an alias token, so light and dark themes both resolve through the
 * theme's own values instead of a literal that would freeze one of them.
 */

/** The id the injected stylesheet is addressed by. */
export const STYLE_ID = 'dsh-notify-styles'

const CSS = `
.dn-section {
  display: flex;
  flex-direction: column;
  gap: 32px;
  box-sizing: border-box;
  max-width: 720px;
  color: var(--dsw-alias-label-primary);
  font-family: inherit;
}

.dn-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.dn-title {
  margin: 0;
  font-size: 16px;
  line-height: 24px;
  font-weight: 500;
  color: var(--dsw-alias-label-primary);
}

.dn-intro {
  margin: 0;
  font-size: 14px;
  line-height: 22px;
  color: var(--dsw-alias-label-tertiary);
}

.dn-readonly {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--dsw-alias-label-tertiary);
}

/* A block is one heading plus its rows; the 32px page gap separates blocks. */
.dn-block {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dn-blockTitle {
  margin: 0;
  font-size: 14px;
  line-height: 20px;
  font-weight: 500;
  color: var(--dsw-alias-label-primary);
}

.dn-card {
  box-sizing: border-box;
  padding: 12px 14px;
  border: 0.5px solid var(--dsw-alias-settings-card-stroke, var(--dsw-alias-border-l4));
  border-radius: var(--dsw-radius-xl, 20px);
  background: var(--dsw-alias-settings-card-fill, var(--dsw-alias-bg-layer-2));
}

/* Field rhythm: 12px of air, and nothing but a hairline between neighbours. */
.dn-stack > * + * {
  border-top: 0.5px solid var(--dsw-alias-border-l2);
}

.dn-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 0;
}

.dn-rowBlock {
  padding: 12px 0;
}

.dn-rowBlock > .dn-row {
  padding: 0;
}

.dn-rowText {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.dn-rowTitle {
  font-size: 14px;
  line-height: 20px;
  color: var(--dsw-alias-label-primary);
}

.dn-rowDesc {
  font-size: 12px;
  line-height: 18px;
  color: var(--dsw-alias-label-tertiary);
}

.dn-statusLine {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  font-size: 13px;
  line-height: 20px;
  color: var(--dsw-alias-label-secondary);
}

/* The action stays at the right edge even when the line has no description. */
.dn-statusLine > .dn-button {
  margin-left: auto;
}

.dn-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  padding: 12px 0;
}

.dn-fieldHead {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dn-label {
  font-size: 13px;
  line-height: 1.5;
  font-weight: 500;
  color: var(--dsw-alias-label-primary);
}

.dn-hint {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--dsw-alias-label-tertiary);
}

.dn-invalid {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--dsw-alias-state-error-primary);
}

.dn-input {
  box-sizing: border-box;
  width: 100%;
  height: 34px;
  padding: 0 12px;
  border: 0.5px solid var(--dsw-alias-border-l4);
  border-radius: var(--dsw-radius-md, 12px);
  background: var(--dsw-alias-bg-layer-3);
  color: var(--dsw-alias-label-primary);
  font-family: inherit;
  font-size: 13px;
  line-height: 20px;
}

/* The measured primitive moves the border, not the focus ring. */
.dn-input:focus {
  border-color: var(--dsw-alias-state-business-primary, var(--dsw-alias-brand-primary));
  outline: none;
}

.dn-input[aria-invalid='true'] {
  border-color: var(--dsw-alias-state-error-primary);
}

.dn-input:disabled {
  opacity: 0.5;
}

.dn-button {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  gap: 6px;
  box-sizing: border-box;
  height: 28px;
  padding: 0 12px;
  border: 0.5px solid var(--dsw-alias-border-l4);
  border-radius: var(--dsw-radius-md, 12px);
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font-family: inherit;
  font-size: 13px;
  line-height: 20px;
  white-space: nowrap;
  cursor: pointer;
  transition: background-color 0.12s ease;
}

.dn-button:hover:not(:disabled) {
  background: var(--dsw-alias-interactive-bg-hover);
}

.dn-button:disabled {
  opacity: 0.4;
  cursor: default;
}

.dn-button--save {
  height: auto;
  padding: 5px 14px;
  border-color: transparent;
  background: var(--dsw-alias-label-primary);
  color: var(--dsw-alias-bg-layer-3);
}

.dn-button--ghost {
  padding: 0 8px;
  border-color: transparent;
  color: var(--dsw-alias-label-secondary);
}

.dn-button--ghost:hover:not(:disabled) {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
}

.dn-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding-top: 4px;
}

.dn-switch {
  position: relative;
  flex: 0 0 auto;
  box-sizing: border-box;
  width: 36px;
  height: 20px;
  padding: 2px;
  border: none;
  border-radius: 999px;
  background: var(--dsw-alias-border-l3);
  cursor: pointer;
  transition: background-color 0.12s ease;
}

.dn-switch--on {
  background: var(--dsw-alias-brand-primary);
}

.dn-switch:disabled {
  opacity: 0.5;
  cursor: default;
}

.dn-switch__thumb {
  display: block;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--dsw-alias-bg-layer-2);
  transition: transform 0.12s ease;
}

.dn-switch--on .dn-switch__thumb {
  transform: translate(16px);
}

.dn-segmented {
  display: inline-grid;
  grid-auto-flow: column;
  align-self: flex-start;
  gap: 2px;
  padding: 4px;
  border-radius: var(--dsw-radius-md, 12px);
  background: var(--dsw-alias-interactive-bg-hover, var(--dsw-alias-bg-module-platform));
}

.dn-segmented__tab {
  box-sizing: border-box;
  height: 28px;
  padding: 0 16px;
  border: none;
  border-radius: var(--dsw-radius-sm, 8px);
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font-family: inherit;
  font-size: 13px;
  line-height: 20px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition: background-color 0.12s ease, color 0.12s ease;
}

.dn-segmented__tab[aria-checked='true'] {
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  box-shadow: var(--dsw-elevation-soft);
}

.dn-segmented__tab:disabled {
  opacity: 0.4;
  cursor: default;
}

.dn-select {
  position: relative;
  min-width: 0;
}

.dn-select__trigger {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  height: 34px;
  padding: 0 12px;
  border: 0.5px solid var(--dsw-alias-border-l4);
  border-radius: var(--dsw-radius-md, 12px);
  background: var(--dsw-alias-bg-layer-3);
  color: var(--dsw-alias-label-primary);
  font-family: inherit;
  font-size: 13px;
  line-height: 20px;
  text-align: left;
  cursor: pointer;
}

.dn-select__trigger:disabled {
  opacity: 0.5;
  cursor: default;
}

.dn-select__value {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dn-select__chevron {
  flex: 0 0 auto;
  color: var(--dsw-alias-label-tertiary);
}

.dn-select__popup {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  left: 0;
  z-index: 20;
  max-height: 280px;
  margin: 0;
  padding: 4px;
  overflow-y: auto;
  list-style: none;
  border-radius: var(--dsw-radius-md, 12px);
  background: var(--dsw-alias-bg-layer-1);
  box-shadow: var(--dsw-elevation-prominent);
}

.dn-select__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  height: 32px;
  padding: 0 10px;
  border: none;
  border-radius: var(--dsw-radius-sm, 8px);
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font-family: inherit;
  font-size: 13px;
  line-height: 20px;
  text-align: left;
  cursor: pointer;
}

.dn-select__item:hover {
  background: var(--dsw-alias-interactive-bg-hover);
}

.dn-select__check {
  flex: 0 0 auto;
  color: var(--dsw-alias-state-business-primary, var(--dsw-alias-brand-primary));
}

.dn-tag {
  display: inline-flex;
  align-items: center;
  height: 18px;
  padding: 1px 8px;
  border: 0.5px solid transparent;
  border-radius: 999px;
  font-size: 11px;
  line-height: 17px;
  font-weight: 500;
}

.dn-tag--neutral {
  background: var(--dsw-alias-bg-module-platform);
  color: var(--dsw-alias-label-secondary);
}

.dn-tag--quiet {
  border-color: var(--dsw-alias-border-l4);
  color: var(--dsw-alias-label-tertiary);
}

.dn-dot {
  display: inline-block;
  flex: 0 0 auto;
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.dn-dot--done {
  background: var(--dsw-alias-state-success-primary);
}

.dn-dot--warning {
  background: var(--dsw-alias-state-warn-primary);
}

.dn-dot--error {
  background: var(--dsw-alias-state-error-primary);
}

.dn-dot--idle {
  background: var(--dsw-alias-state-idle-primary);
}

.dn-warn {
  margin: 0;
  padding: 0 0 4px;
  font-size: 12px;
  line-height: 18px;
  color: var(--dsw-alias-state-warn-label);
}

.dn-notice {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
}

.dn-notice--success {
  color: var(--dsw-alias-state-success-primary);
}

.dn-errorBar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 0;
  border-top: 0.5px solid var(--dsw-alias-border-l2);
  border-bottom: 0.5px solid var(--dsw-alias-border-l2);
}

.dn-errorBar__text {
  min-width: 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--dsw-alias-state-error-primary);
  overflow-wrap: anywhere;
}

.dn-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-top: 16px;
}

.dn-footer__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dn-volumeRow {
  display: flex;
  align-items: center;
  gap: 12px;
}

.dn-range {
  flex: 1 1 auto;
  min-width: 0;
  height: 20px;
  background: transparent;
  accent-color: var(--dsw-alias-brand-primary);
}

.dn-volumeValue {
  flex: 0 0 auto;
  min-width: 44px;
  font-size: 13px;
  line-height: 20px;
  color: var(--dsw-alias-label-secondary);
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.dn-sound {
  display: flex;
  flex-direction: column;
  padding-top: 4px;
}

.dn-sound__head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 44px 128px 148px 64px;
  gap: 8px;
  padding-bottom: 6px;
  font-size: 12px;
  line-height: 18px;
  color: var(--dsw-alias-label-tertiary);
}

.dn-sound__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 44px 128px 148px 64px;
  gap: 8px;
  align-items: center;
  padding: 10px 0;
}

.dn-sound__row + .dn-sound__row {
  border-top: 0.5px solid var(--dsw-alias-border-l2);
}

.dn-sound__name {
  min-width: 0;
  font-size: 13px;
  line-height: 20px;
  color: var(--dsw-alias-label-primary);
}

.dn-kv {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 0;
  font-size: 13px;
  line-height: 20px;
}

.dn-kv__key {
  color: var(--dsw-alias-label-tertiary);
}

.dn-kv__value {
  min-width: 0;
  color: var(--dsw-alias-label-primary);
  text-align: right;
}

.dn-skeleton {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dn-skeleton__line {
  height: 14px;
  border-radius: var(--dsw-radius-sm, 8px);
  background: var(--dsw-alias-bg-skeleton);
}

.dn-skeleton__line--short {
  width: 40%;
}

/* Below the shell's narrow breakpoint the sound grid stacks into pairs. */
@media (max-width: 560px) {
  .dn-sound__head {
    display: none;
  }

  .dn-sound__row {
    grid-template-columns: minmax(0, 1fr) auto;
    row-gap: 8px;
  }

  .dn-sound__name {
    grid-column: 1 / -1;
  }
}

/* One channel: a header row whose switch opens its own settings. */
.dn-channel {
  display: flex;
  flex-direction: column;
}

.dn-channelHead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
}

.dn-rowAside {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: none;
}

.dn-channelBody {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 0 16px 16px 16px;
}

.dn-channelSep {
  height: 0.5px;
  background: var(--dsw-alias-border-l2);
}

/* The quieting rules belong to the master switch, so they sit inside it. */
.dn-indent {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-top: 2px;
  padding: 14px 16px 16px 16px;
  border-top: 0.5px solid var(--dsw-alias-border-l2);
}
`;

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
