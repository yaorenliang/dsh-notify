/** Page frame and the shared type scale. */
export const PAGE = `
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

`
