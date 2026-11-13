# Architecture

Three layers, one direction of flow.

```
              ┌───────────────────────────── Host ─────────────────────────────┐
 session/event ─┤ classifier ─► dispatcher ─┬─► Bark (HTTPS, fire and forget)   │
 approval/req  ─┤  (core)        (policy,    │                                    │
 questions     ─┘                 dedupe,    └─► SSE hub ──► /api/dsh-notify/stream
                                  limits)                                   │
                                                                            ▼
              ┌──────────────────────────── Browser ─────────────────────────────┐
              │ EventSource ─► sound + system notification ─► click opens session │
              │ settings page ─► config API ─► Host document                       │
              └───────────────────────────────────────────────────────────────────┘
```

## `src/core` — pure logic

No Host import, no DOM, no clock it is not given. Four modules:

- `events.ts` — the event vocabulary and turn-end classification. A turn becomes
  `completed` only when its recorded reason says so; `blocked`, `max-tokens`,
  `forked`, and unknown reasons return `silent` and never reach a channel.
- `render.ts` — every sentence the plugin writes itself, in Chinese or English.
  Classification returns facts; copy lives here.
- `policy.ts` — whether an event may interrupt: subagent silence, the session on
  screen, presence expiry.
- `config.ts` — the configuration shape, defaults, defensive merging, and the
  redacted projection. A masked secret echoed back keeps the stored value; only
  `null` erases one.

## `src/host` — observation and delivery

- `index.ts` — subscribes to `session/event`, `approval/request`, and
  `user-questions/request`; owns the settle window, the route table, and the
  session memory that supplies titles and the last assistant text.
- `dispatcher.ts` — collapses duplicates by `kind:id`, applies `policy`, applies
  burst limits (6/min per session, 20/min overall), then fans out.
- `bark.ts` — one payload, one POST, no retry: a missed push is a missed moment,
  not a lost fact.
- `sse.ts` — a sink set, heartbeats, and a drop-on-write-failure rule.
- `store.ts` — atomic document writes and defensible reads.
- `title.ts` — the single title format both channels use.

## `src/client` — presentation

- `stream.ts` / `api.ts` — the EventSource and the four JSON routes.
- `notify.ts` — the Notification API and synthesised sounds (no audio assets).
- `model.ts` — one external store the settings page subscribes to.
- `settings/` — the Notifications page and its primitives.
- `index.tsx` — wiring: stream → sound + card, presence reports, settings
  registration, cross-tab arbitration through `localStorage`.

## Invariants worth keeping

1. One logical happening produces at most one card per channel.
2. The browser never classifies; it only displays.
3. Secrets never cross to the browser, never enter the SSE payload, never log.
4. Everything under `/api` is authenticated by Connection, not by this plugin.
