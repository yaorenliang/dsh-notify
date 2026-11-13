# Changelog

## 0.1.0

- First release: one Host event model driving a browser channel (system
  notification, per-kind sound, click-to-session, collapse by kind) and a Bark
  channel (APNs push with group, icon, per-kind sound, deep link).
- Authenticated transport under `/api/dsh-notify/*`: SSE stream, config read and
  write, presence report, host state, and a per-channel test.
- First-run import of `push-notify-config.json`, leaving the legacy file intact.
- Subagent silence, presence-aware quieting, and per-happening de-duplication.
