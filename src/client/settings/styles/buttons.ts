/** Action buttons and the row that lines them up. */
export const BUTTONS = `/* The measured primitive moves the border, not the focus ring. */
.dn-input:focus {
  border-color: var(--dsw-alias-state-business-primary, var(--dsw-alias-brand-primary));
  outline: none;
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

`
