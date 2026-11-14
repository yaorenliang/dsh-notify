/** The switch and the segmented control. */
export const PICKERS = `.dn-switch {
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

`
