# Changelog

## 0.1.6 — 2026-11-14

Choosing a sound now plays it. The local picker plays the browser tone straight
away, and the phone picker sends one push carrying the ring you just chose, so a
ringtone can be heard before it is committed — and the phone, which plays its own
sound, is the only thing that can let you hear it.

That audition uses the same test route with a `kind` and a `sound` attached, so
nothing is written to the configuration: cancel by picking another sound.

## 0.1.6 — 2026-11-14

Browser notifications no longer depend on holding a stream open. A page gets six
connections per origin on HTTP/1.1 and a DSH tab holds several of them, so the
event stream can be the one request that never gets a socket — or the browser can
close it for good after a restart and never retry. The tab looked healthy (it
reported presence every 20 seconds) while the phone kept working, because the push
channel never used that stream.

The Host now keeps a ten-minute, two-hundred-entry backlog with a cursor, and the
browser falls back to collecting from it over ordinary requests when the stream
does not open within eight seconds or the browser closes it. A new tab is handed
the current cursor first, so nothing old is replayed.

## 0.1.5 — 2026-11-14

Fixes the settings section going missing after installing from the registry: the
browser bundle registered itself as `dsh-notify` while the package is
`@yaorenliang/dsh-notify`, and the Host looks a client plugin up by package name.
A local `link:` install matched by accident; a registry install never did, so the
page, the sounds and the notifications were all silently absent.

The bundle id is now read from `package.json` instead of being written by hand.

## 0.1.4 — 2026-11-14

A fresh install now says what the browser has not decided yet, and offers the one
button that can ask: a notification prompt only opens inside a gesture, so nothing
fires by itself.

Under the same version the plugin was taken apart and put back together without
changing what it does: the notification fields nothing read are gone, the settings
page is six modules instead of one 357-line component, its stylesheet is seven
cascade-order modules that join to the exact same 12,048 characters, and the
connection drafts now survive closing a channel.

## 0.1.3 — 2026-11-14

The page ends with one quiet line: a star ask and a link to this repository,
after every control rather than in front of them. The READMEs carry the same
line, where someone deciding whether to keep the plugin actually reads it.

## 0.1.2 — 2026-11-14

The settings section is called 会话通知 / Session alerts and carries its own bell,
drawn on the same grid and stroke as the built-in icons instead of falling back to
the generic gear.

## 0.1.1 — 2026-11-14

Releases now go out from GitHub Actions through trusted publishing: the npm side
trusts this repository and `publish.yml`, so no token and no one-time password
lives anywhere. The package itself is unchanged; this version exists so the
pipeline is proven end to end.

## 0.1.0 — 2026-11-14

First release: one Host event model driving a browser channel (system
notification, per-kind sound, click-to-session, collapse by kind) and a Bark
channel (APNs push with group, per-kind sound, optional link).

A notification reads like the conversation: the title is a status mark plus the
session name, and the body is the prompt the person last typed, with the outcome
appended for failures and interruptions.

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

- One JSON document per profile, written atomically. Nothing is imported from a
  predecessor plugin; this release owns its file from the first run.
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