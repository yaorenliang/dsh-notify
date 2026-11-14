/** Blocks, fields, labels, hints and the inputs they hold. */
export const FIELDS = `/* A block is one heading plus its rows; the 32px page gap separates blocks. */
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

`
