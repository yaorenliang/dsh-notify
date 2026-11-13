#!/usr/bin/env node
/**
 * Check a freshly booted Host end to end.
 *
 * After DSH restarts, the only remaining question is whether the plugin really
 * answers on the live port. This script takes the launch token the Host just
 * printed, exchanges it for a session cookie, and asks the plugin's own routes;
 * it never touches the configuration and never needs a browser.
 *
 *   node scripts/accept.mjs            # uses DSH_WEB_URL or 127.0.0.1:3080
 *   node scripts/accept.mjs --test     # also fire one notification per channel
 */
import { readFileSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const args = new Set(process.argv.slice(2))
const base = process.env.DSH_WEB_URL ?? 'http://127.0.0.1:3080'

/** The most recent launch token the Host logged. */
function launchToken() {
  const dir = join(homedir(), '.dsh', 'logs')
  let newest = null
  for (const name of readdirSync(dir)) {
    if (!name.startsWith('dsh-web')) continue
    const text = readFileSync(join(dir, name), 'utf8')
    for (const match of text.matchAll(/dsh web: \S*\?token=([A-Za-z0-9_-]+)/g)) {
      const at = text.lastIndexOf(match[0])
      if (newest === null || at > newest.at) newest = { at, token: match[1] }
    }
  }
  return newest?.token ?? null
}

const token = process.env.DSH_TOKEN ?? launchToken()
if (token === null) {
  console.error('accept: no launch token found; set DSH_TOKEN')
  process.exit(1)
}

/** Exchange the launch token for a session cookie. */
async function authenticate() {
  const response = await fetch(`${base}/?token=${token}`, { redirect: 'manual' })
  const cookies = response.headers.getSetCookie?.() ?? []
  const cookie = cookies.map((value) => value.split(';')[0]).join('; ')
  if (cookie.length === 0) throw new Error(`no session cookie (HTTP ${response.status})`)
  return cookie
}

const cookie = await authenticate()
const get = async (path) => {
  const response = await fetch(`${base}${path}`, { headers: { cookie } })
  return { status: response.status, body: await response.json().catch(() => null) }
}
const post = async (path, body) => {
  const response = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { cookie, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  return { status: response.status, body: await response.json().catch(() => null) }
}

const failures = []
const state = await get('/api/dsh-notify/state')
if (state.status !== 200 || state.body?.ok !== true) failures.push(`state: HTTP ${state.status}`)

const config = await get('/api/dsh-notify/config')
if (config.status !== 200) failures.push(`config: HTTP ${config.status}`)
const bark = config.body?.config?.bark
if (bark !== undefined && typeof bark.deviceKey?.deviceKey === 'string') {
  failures.push('config: the device key reached the browser')
}
if (state.status === 200 && state.body?.browsers === 0 && args.has('--test')) {
  console.log('accept: no browser attached; skipping the browser test push')
}

const summary = {
  base,
  state: state.body,
  channels: config.body?.config === undefined ? null : {
    browser: config.body.config.browser.enabled,
    bark: config.body.config.bark.enabled,
    deviceKey: config.body.config.bark.deviceKey,
  },
}

if (args.has('--test')) {
  if ((state.body?.browsers ?? 0) > 0) {
    const browser = await post('/api/dsh-notify/test', { channel: 'browser' })
    summary.browserTest = browser.body
  }
  const push = await post('/api/dsh-notify/test', { channel: 'bark' })
  summary.barkTest = push.body
  if (push.body?.ok === true && push.body?.result?.ok === false) failures.push('bark: the push was refused')
}

console.log(JSON.stringify(summary, null, 2))
if (failures.length > 0) {
  console.error(`accept: ${failures.length} problem(s):\n  ${failures.join('\n  ')}`)
  process.exit(1)
}
console.log('accept: ok')
