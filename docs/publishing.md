# Publishing

The repository is ready to publish; the two commands below are the only steps
that leave this machine. Both need credentials this machine does not currently
hold, which is why they are gated on the owner's decision.

## 1. Repository

```sh
cd ~/git/dsh-notify
gh auth login                       # once, on the machine that publishes
gh repo create yaorenliang/dsh-notify --public --source . --push \
  --description "Unified browser + Bark notifications for DeepSeek Harness"
gh repo edit --add-topic dsh,dsh-plugin,notifications,bark,deepseek
```

## 2. Package

```sh
npm login                           # once
npm publish --access public         # files: lib/, cordis.patch.yml, LICENSE, README*
```

`prepublishOnly` runs `pnpm verify` (typecheck + tests + build), so a broken build
cannot be published. The tarball contains no configuration and no secret: the
device key is created at runtime inside the profile directory.

## 3. After publishing

- Tag the release (`git tag v0.1.0 && git push --tags`) and paste the CHANGELOG
  section into the release notes.
- Users install with `dsh plugin --profile web add dsh-notify` and restart DSH.
- The predecessor plugins are not dependencies and are never touched by this
  package; the first run imports a copy of their configuration and leaves the
  original in place.

## What not to publish

- `~/.dsh/profiles/web/dsh-notify.json` (contains the Bark device key).
- Any screenshot of a real session list; use a scratch profile for marketing
  images.
