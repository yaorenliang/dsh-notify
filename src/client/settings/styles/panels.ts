/** The select menu, tags, status dots and the notice bars. */
export const PANELS = `.dn-select {
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
  grid-template-columns: minmax(0, 1fr) 44px 128px 148px;
  gap: 8px;
  padding-bottom: 6px;
  font-size: 12px;
  line-height: 18px;
  color: var(--dsw-alias-label-tertiary);
}

.dn-sound__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 44px 128px 148px;
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

`