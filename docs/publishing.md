# Publishing

Two artifacts leave this machine: the repository and the npm package. Everything
else — tests, build, the profile — stays local.

## Repository

```sh
git push origin main
git tag -a v0.1.1 -m "v0.1.1"
git push origin v0.1.1
```

The release is created from that tag on GitHub, with the matching section of
`CHANGELOG.md` as its body. CI (`.github/workflows/ci.yml`) runs typecheck,
tests, build and a packed-artifact check on Node 20 and 22.

## Package

Publishing the release in GitHub starts `.github/workflows/publish.yml`, which
runs `pnpm verify` and then `npm publish --access public`. Nothing is typed by
hand and no secret is stored: the workflow presents an OIDC identity, and the
npm side has a **trusted publisher** connection naming this repository and this
filename. `npm stage publish` is always allowed; direct publish is granted too, so
a release goes out without a second visit to the website.

The tarball carries no configuration and no secret: the device key lives in the
profile directory, created at runtime, and `prepublishOnly` runs `pnpm verify`
again on any local publish.

### Why this and not a token

npm requires a second factor for publishing. Three paths exist:

1. **Trusted publishing (in use).** OIDC from GitHub Actions, no token, no OTP.
   Requires account-level 2FA to be configured, because npm refuses to edit
   package settings without it — the account here uses a Touch ID security key,
   with recovery codes in `~/.dsh/secrets/npm_recovery_codes.txt`.
2. **Granular bypass token.** Works until npm retires it for publishing in
   January 2027. v0.1.0 was published this way: a 7-day token in a `600` file
   outside the repository, used once, then revoked.
3. **An OTP from an authenticator app** at publish time, which needs a
   TOTP-capable factor; security keys cannot feed the CLI.

A publish can answer `202` while the package is still being processed, and the
registry serves `404` for a few minutes afterwards. Verify with
`npm view <name> version` and `npm pack <name>@<version>` before announcing.

## After publishing

- Confirm the public page, the tarball contents (`tar -tzf`) and the install line
  in both READMEs.
- Users install with `dsh plugin --profile web add @yaorenliang/dsh-notify`. The
  profile hot-applies a *new* bundle; a plugin that is already loaded keeps the
  host code it was started with until DSH restarts.
- The predecessor plugins are not dependencies and are never touched; nothing is
  imported from them (see D7 in `docs/decisions.md`).

## What not to publish

- `~/.dsh/profiles/web/dsh-notify.json` (contains the Bark device key).
- Any screenshot of a real session list; use a scratch profile for marketing
  images.
