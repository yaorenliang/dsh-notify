# Publishing

Two artifacts leave this machine: the repository and the npm package. Everything
else — tests, build, the profile — stays local.

## Repository

```sh
git push origin main
git tag -a v0.1.0 -m "v0.1.0 — notifications that read like the conversation"
git push origin v0.1.0
```

The release is created from that tag on GitHub, with the matching section of
`CHANGELOG.md` as its body. CI (`.github/workflows/ci.yml`) runs typecheck,
tests, build and a packed-artifact check on Node 20 and 22; it must be green
before a version is announced.

## Package

```sh
npm publish --access public   # files: lib/, cordis.patch.yml, LICENSE, README*
```

`prepublishOnly` runs `pnpm verify` (typecheck + tests + build), so a broken
build cannot be published. The tarball carries no configuration and no secret:
the device key lives in the profile directory, created at runtime.

### The npm 2FA requirement

npm refuses a publish that is not backed by a second factor, and it answers the
attempt with `403 … Two-factor authentication or granular access token with
bypass 2fa enabled is required`. Three paths exist, in order of preference:

1. **Trusted publishing (target state).** A GitHub Actions workflow publishes
   through OIDC, with no token and no OTP. It needs account-level 2FA to be
   configured first, because npm requires 2FA before it lets anyone edit a
   package's settings.
2. **Granular bypass token.** Create a short-lived granular token with
   "Bypass 2FA" and "Read and write" on this package, publish with it, then
   delete the token. npm is retiring this path for publishing in January 2027.
   v0.1.0 was published this way: a 7-day token kept in a `600` file outside the
   repository, used once, then revoked.
3. **Publish with an OTP** from an authenticator app, which needs a TOTP-capable
   2FA method on the account.

A publish with a bypass token can answer `202` while the package is still being
processed; the registry serves `404` for a few minutes afterwards. Verify with
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
