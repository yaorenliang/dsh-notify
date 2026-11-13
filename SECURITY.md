# Security

## What this plugin holds

- A Bark device key (one string). It lives in `dsh-notify.json` inside the DSH
  profile directory, is written with mode `0600`, and never leaves the Host
  except as an HTTPS request to the Bark server it configures.
- No session content is stored. The renderer reads the last assistant text of a
  turn from memory to fill a notification body, and the cross-session cache is a
  title plus a short text, bounded in size.

## What the browser can see

The settings page reads a projection in which the device key is reduced to
`{configured, masked}` (dots plus the last four characters). The live event
stream carries titles and bodies only. Posting a masked key back keeps the stored
one; clearing requires an explicit `null`.

## Transport

Every route is registered through `ctx.connection.fetch` under `/api/dsh-notify/*`,
so Connection admits only the owner peer, rejects cross-site requests, and
requires the browser's session credential. The plugin adds no transport of its
own and exposes no unauthenticated endpoint.

## Reporting

Open a private security advisory on the repository rather than a public issue for
anything involving the device key, an approval chain, or request forgery.
