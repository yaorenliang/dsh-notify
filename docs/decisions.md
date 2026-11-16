# Design decisions

Short records of the choices that shaped the plugin. Each one names the
alternatives that were considered and why they lost, so a future change can tell
whether it is reversing a decision or repeating a mistake.

## D1 — The Host classifies; the browser only presents

**Chosen.** One classifier on the Host reads `turn/end`, `approval/request`, and
`user-questions/request`, and fans the same event out to Bark and to the browser.

**Rejected.** Let the browser classify from the session list (what
`dsh-session-notification` does). It works, but the phone channel has to classify
anyway — with the browser closed, nothing else can — so the "did this turn really
finish" heuristic would exist twice and drift. The browser also cannot see queued
work or the subagent tree as precisely as the Host can.

**Consequence.** If the Host plugin fails to load, the browser channel is down
too. Accepted: one plugin, one failure mode.

## D2 — Authenticated `/api` routes instead of a self-issued token

**Chosen.** `ctx.connection.fetch.register` under `/api/dsh-notify/*`. Connection
admits the request only for the owner Peer and already carries the browser
session; the SSE response is streamed through the node:http bridge.

**Rejected.** `ctx.webServer.register` with a plugin-generated token (what
`dsh-push-notify` does). Its `/dsh-push-notify/config` route is unauthenticated:
anyone on the same tailnet can read the masked config, overwrite the device key,
or fire test pushes. A self-issued token would also have to be handed to the
browser over the same unauthenticated surface.

**Consequence.** The plugin depends on Connection's presence in the composition
(`inject: ['connection']`).

## D3 — The plugin owns one JSON document

**Chosen.** `$DSH_PROFILE_DIR/dsh-notify.json`, written atomically by the Host,
exposed to the browser as a redacted projection through the authenticated API.

**Rejected.** Declaring the configuration on the Loader row and writing it through
`ctx.remote.settings`. It is the more native shape and gives secret redaction for
free, but the write path either restarts the plugin row (dropping the live
streams) or relies on a volatile-only Loader path whose behaviour would have to be
proven against the running build before shipping. It also splits one settings
document into two stores once browser-only preferences exist.

**Consequence.** Secrets are the plugin's responsibility: they never leave the
Host, are masked to their last four characters, and only an explicit `null`
erases one. Nothing is imported from a predecessor plugin (see D7).

## D4 — A custom settings page, not the generated plugin form

**Chosen.** One `settings.section` page that mirrors the Harness settings language
(geometry, tokens, control sizes) and adds what a generated form cannot: a test
button per channel, live channel status, per-kind sound preview.

**Rejected.** The generated configuration form plus a tiny custom status block. It
is the smallest possible UI and the most native by construction, but it cannot
preview sounds or run a test push, which are the two things a user needs to trust
a push plugin — and it would leave two configuration surfaces on one page.

**Consequence.** The page must be re-checked against the Harness settings shell on
each DSH minor upgrade; the geometry lives in one styles module for that reason.

## D5 — No replay on the event stream

**Chosen.** The SSE stream is a live feed with no `Last-Event-ID` handling and no
ring buffer.

**Rejected.** Replaying missed events after a reconnect. A notification describes a
moment; replaying an approval from four minutes ago invites acting on a stale
request, and replaying a completion that the person already read is noise.

**Consequence.** A browser that was disconnected simply misses those cards; the
phone channel is the durable one, which is what a phone is for.

## D6 — One package, three internal layers

**Chosen.** `src/core` (pure logic, runs under vitest), `src/host`, `src/client`,
shipped as one npm package with one bundle patch.

**Rejected.** A pnpm workspace with separately versioned packages. The plugin is
small, the three layers ship together, and a single package keeps installation to
one line.

## D7 — No import from a predecessor plugin

**Chosen.** The plugin owns one document and reads nothing else. A missing file
means defaults.

**Rejected.** Importing `push-notify-config.json` on first run (what D3 originally
described). It made the first activation feel seamless, but it also meant every
read had to reason about a second document's shape, and the copied group name
outlived the decision to standardise on `DSH`. Two plugins that never speak to
each other are simpler to reason about than a one-time translation path.

**Consequence.** Upgrading means opening the settings page once. The predecessor's
file is left untouched, so nothing is lost either way.

## D8 — A notification reads like the conversation

**Chosen.** Title: a status mark plus the session name. Body: the prompt the person
last typed in that turn; a scheduled or injected turn has no prompt, so it falls
back to the answer. Failures and interruptions append their reason after `·`.

**Rejected.** The assistant's closing paragraph (the earlier behaviour). It reads
like a summary of work the person did not ask to see on a lock screen, and on a
phone it competes with the one thing that identifies the notification: the
question that started it.

**Consequence.** The Host must watch `user/message` and keep the last message whose
`source.kind` is `user`, so injected context (cron, file-change notices, goal
continuations) never becomes the body.

## D9 — A channel folds open when it is on

**Chosen.** The master switch and the two quieting rules come first; each channel's
settings appear only while that channel is enabled, and per-kind sound lives in one
table with an enable switch, a browser sound, a Bark sound, and a preview.

**Rejected.** Always-visible channel blocks (the earlier layout). Half the fields
were disabled most of the time, which makes a settings page look broken rather than
configured.

## D10 — The plugin card is localized in the package, not in the market

**Chosen.** `locale/en.json` and `locale/zh.json` carry `meta.title`,
`meta.description` and `meta.detail`. Harness reads the English file as the
dictionary's anchor and every sibling language file beside it, and the detail pane
reads the Markdown `meta.detail` names for the first language in the reader's chain
that declares one — so a Chinese reader sees 「会话通知」, a Chinese sentence, and
`docs/DETAIL.zh.md` instead of the README.

**Rejected.** Localizing only the market listing. The market (`dshmarket`) takes its
card from a *catalog entry* (`description.zh` in the awesome-dsh-plugin repo) and
never reads the package's locale files, while the Harness plugin page takes it from
the package and never reads the catalog. One channel cannot serve the other, and the
catalog only reaches Chinese installs once its npm snapshot is republished. The
package is the half we control, so it is the half that ships.

**Consequence.** The market card stays English until the catalog snapshot catches up;
that is an upstream fix, not a change here. `test/locale.test.ts` pins the four ways
this breaks silently: a missing `en.json`, a Chinese card copied from English, a
`meta.detail` that leaves the package or does not ship, and a `files`/`exports` list
that drops either the locales or the documents.
