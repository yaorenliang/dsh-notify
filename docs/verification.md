# Verification

What "it works" means for this plugin, and how to check each claim without
reading the source. Run the automated part with `pnpm verify`; run the manual
part once per machine.

## Automated

```sh
pnpm install
pnpm typecheck     # tsc --noEmit, exit 0
pnpm test          # vitest, 77 tests
pnpm build         # lib/index.js + lib/client.js + lib/types
```

The suite covers four layers:

| File | Proves |
|---|---|
| `test/core.test.ts` | turn-end classification whitelist, copy rendering in both languages, delivery policy, config merge and secret masking. |
| `test/host.test.ts` | Bark payload composition, transport failure reporting, SSE frame encoding and fan-out. |
| `test/dispatcher.test.ts` | one event → two channels, duplicate collapse and its expiry, subagent silence, prefixing, per-session burst limits, and a channel that reports only what it delivered. |
| `test/client-model.test.ts` | the settings page's store against a fake Host: load, patch write, busy transitions, and a refused push surfacing its reason instead of reading as success. |
| `test/plugin.test.ts` | the real `apply()` against a fake Host that enforces Cordis's inject guard: the five routes, a redacted configuration round trip, a completed turn travelling over SSE after its settle window, a completion cancelled by the next turn, an unknown ending staying silent, an approval waterfall that always continues, presence across two tabs. |

## Manual, on the installed Host

1. **Host loaded** — the settings panel shows **Notifications** in the sidebar.
2. **Configuration** — paste the Bark device key, enable Bark, press **Test**;
   the phone receives "DeepSeek Harness / This is a test notification from dsh-notify."
3. **Browser channel** — enable it, grant the notification permission, press
   **Test** with a backgrounded tab; a system card appears.
4. **Real turn** — ask the agent something short; exactly one card appears within
   about a second of the answer, titled with the session name.
5. **Subagent silence** — start a task that delegates; only the main session's
   completion arrives.
6. **No duplicates** — a permission request produces exactly one approval card.
7. **Secrets stay home** — a search for the device key across the plugin's
   installed `lib/` finds nothing, and the settings field shows dots plus the last
   four characters.
8. **Authenticated transport** — `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3080/api/dsh-notify/state`
   answers `401` without a browser session.

## Rollback

- Disable the plugin: remove `dsh-notify` from `dsh.profile.bundles` in
  `~/.dsh/profiles/web/package.json`, or `dsh plugin --profile web remove dsh-notify`.
- The predecessor's document `push-notify-config.json` is never modified, so
  re-enabling `dsh-push-notify` restores its behaviour.
- The plugin's own document lives at `~/.dsh/profiles/web/dsh-notify.json`.
