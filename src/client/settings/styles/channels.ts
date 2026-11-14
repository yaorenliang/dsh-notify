/** The channel rows, the quieting rules, and the foot of the page. */
export const CHANNELS = `/* One channel: a header row whose switch opens its own settings. */
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

/* The foot of the page: one quiet line, after everything the page is for. */
.dn-invite {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 18px 0 0;
  padding-top: 14px;
  border-top: 0.5px solid var(--dsw-alias-border-l2);
  font-size: 12px;
  line-height: 20px;
  color: var(--dsw-alias-label-tertiary);
}

.dn-invite__star {
  font-size: 13px;
  line-height: 1;
  color: var(--dsw-alias-state-warn-primary);
}

.dn-invite__link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--dsw-alias-label-secondary);
  text-decoration: none;
}

.dn-invite__link:hover {
  color: var(--dsw-alias-label-primary);
  text-decoration: underline;
}

.dn-invite__out {
  opacity: 0.7;
}
`
