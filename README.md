# dsh-notify

[中文](./README.zh.md) | English

One notification plugin for [DeepSeek Harness](https://github.com/deepseek-ai/dsh): **browser system notifications and Bark push, decided once**.

Most setups end up with two plugins — one that shows browser notifications and one that pushes to a phone. They classify events independently, so they drift: the phone reports "turn 12 ended" while the browser reports "finished", an approval arrives twice, and a subagent's chatter leaks into both. `dsh-notify` classifies once on the Host, then fans the same event out to every channel.

## What you get

- **Browser channel** — system notifications with a per-kind sound, click to jump back to the session, collapse by kind so a burst stays one card.
- **Bark channel** — APNs push to your phone even with the browser closed, per-kind sounds, a group, an icon, and a deep link back into the UI.
- **One event model** — `completed`, `failed`, `interrupted`, `approval`, `question`. Each logical happening is delivered at most once.
- **Quiet by design** — subagent sessions are silent, the session you are actively looking at stays quiet, and a stale presence report never hides an approval.
- **One settings page**, bilingual, matching the Harness UI, with a test button per channel and masked secrets.
- **Authenticated transport** — configuration and the live stream ride Connection's `/api` fence; there is no unauthenticated route to change your device key.

## Install

```sh
dsh plugin --profile web add dsh-notify
```

Then reload the page and open **Settings → Notifications**, paste your Bark device key, enable the channels you want, and press **Test** on each. The profile hot-applies the bundle, so no restart is required.

From a local checkout:

```sh
pnpm install
pnpm build
dsh plugin --profile web add ./dsh-notify
```

## Configuration

The Host owns one JSON document in the active profile directory (`~/.dsh/profiles/web/dsh-notify.json` by default, or `$DSH_PROFILE_DIR` when set). The browser only ever receives a redacted projection: a secret shows as `configured` plus its last four characters, an empty field keeps the stored value, and only an explicit `null` erases one.

| Key | Meaning |
|---|---|
| `prefix` | Title prefix, rendered as `[text] ` (max 12 characters). |
| `baseUrl` | UI root used by the push deep link, e.g. `http://127.0.0.1:3080`. Empty omits the link. |
| `notifySubagents` | Whether sessions spawned by another session may alert. Off by default. |
| `events.<kind>.enabled` | Per-kind switch for both channels. |
| `events.<kind>.sound` | Browser sound: `chime`, `fault`, `pop`, `alert`. |
| `events.<kind>.barkSound` | Bark sound name; `system` uses the device default. |
| `browser.enabled` / `browser.volume` | Browser channel and its volume (0–1). |
| `browser.currentSessionMode` | `hidden` (quiet only while the tab is visible), `unfocused` (quiet only while focused), `always`. |
| `bark.enabled` / `bark.serverUrl` / `bark.deviceKey` | Bark channel and credentials. |
| `bark.group` / `bark.icon` | Notification group and optional icon URL. |

## How it works

```
Host events ──► classifier ──► delivery policy ──► ┬─► Bark (HTTPS)
 (turn/end,      (5 kinds,      (subagent,         └─► SSE ──► browser card + sound
  approval/asked, one per         presence,
  questions)      happening)      per-kind switch)
```

- The Host listens to `session/event` for `turn/end`, to the `approval/request` waterfall for permissions, and to `user-questions/request` for questions. A turn is `completed` only when its recorded reason says so.
- Presence is reported by the browser (`visible`, `focused`) and expires; an expired report means "nobody is looking" and the notification goes out.
- Transport is one SSE stream plus four JSON routes under `/api/dsh-notify/*`, registered through `ctx.connection.fetch` so Connection authenticates every request.

## Requirements

- DeepSeek Harness `>=0.2.2-rc.1 <0.3.0`, Node `>=20`.
- A Bark app on iOS for the phone channel (the server defaults to `https://api.day.app`).

## Development

```sh
pnpm install
pnpm test        # unit tests for the event model, policy, config, and channels
pnpm typecheck
pnpm build       # Host ESM entry + browser lazy-CJS bundle
node scripts/accept.mjs --test   # after a restart: check the live Host end to end
```

Layout: `src/core` is pure logic (no Host, no DOM, runs under vitest), `src/host` owns classification and delivery, `src/client` owns presentation.

## License

MIT © 姚壬亮
