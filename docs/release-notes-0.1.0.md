# v0.1.0 — one decision, two channels

English | [中文](./release-notes-0.1.0.zh.md)

First public release.

## Why

Two notification plugins for one Harness means two classifiers: the phone says
"turn 12 ended" while the browser says "finished", an approval arrives twice, a
subagent's chatter leaks into both. `dsh-notify` classifies once on the Host and
fans the same decision out to every channel.

## What's in it

**Browser** — system notifications with a per-kind sound, click to jump back to
the session, collapse by kind, and quiet while you are looking at that session.

**Phone** — Bark push with group, per-kind sound and an optional link back into
the UI; works with the browser closed.

**Reads like the conversation** — the title is a status mark plus the session name,
the body is the prompt you last typed, and failures append their reason.

**One event model** — `completed`, `failed`, `interrupted`, `approval`,
`question`. A turn is "completed" only when the Host actually says so;
`blocked`, `max-tokens`, `forked` and unknown endings stay silent rather than
paging you about work that did not finish.

**Not noisy** — a completion waits 900 ms so a queued continuation cancels it;
subagent sessions are silent by default; at most one card and one push per
happening; 6/min per session and 20/min overall as a storm brake.

**Boringly secure** — everything rides Connection's authenticated `/api` fence.
The device key never reaches the browser: the page sees `configured` plus its last
four characters, an echoed mask keeps the stored value, and only an explicit
`null` erases it.

## Install

```sh
dsh plugin --profile web add @yaorenliang/dsh-notify
```

Reload the page, open **Settings → Notifications**, paste the Bark key, press
**Test** on each channel. The profile hot-applies the bundle; no restart needed.

## Upgrading from the two-plugin setup

Nothing is removed automatically, and nothing is copied either: open the settings
page once, paste the Bark key, and delete the old plugins when the new page looks
right. The predecessor's own document stays where it is.

## Known limitations

No replay for a disconnected browser, one person per profile, and only Chrome has
been exercised on macOS.
