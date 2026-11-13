# Changelog

## 0.1.0 — unreleased

First release: one Host event model driving a browser channel (system
notification, per-kind sound, click-to-session, collapse by kind) and a Bark
channel (APNs push with group, icon, per-kind sound, deep link).

### Behaviour

- Turn endings are classified from the recorded reason; an ending the Host does
  not name stays silent instead of being announced as "completed".
- A completion waits 900 ms before it is announced, so a queued continuation
  cancels it and a chain of turns produces one card at the real end.
- Subagent sessions are silent by default, the session on screen is quiet while
  the tab is visible, and an expired presence report errs toward delivering.
- At most one card and one push per happening; burst limits (6/min per session,
  20/min overall) keep a runaway loop from becoming a notification storm.

### Configuration

- One JSON document per profile, written atomically, imported from
  `push-notify-config.json` on first run while leaving the legacy file untouched.
- Secrets never cross to the browser: the page sees `configured` plus the last
  four characters, an exactly-echoed mask keeps the stored value, and only an
  explicit `null` erases one.

### Transport

- Everything lives under `/api/dsh-notify/*` through `ctx.connection.fetch`, so
  Connection gates the owner peer and cross-site requests; the plugin adds no
  endpoint of its own and no self-issued token.

### Known limitations

- The event stream is live only: a browser that was disconnected misses those
  cards, and no replay is attempted by design.
- One person per profile; there is no multi-user routing of notifications.
- Verified on macOS with Chrome. Firefox has not been exercised.
