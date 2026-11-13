/**
 * The browser half: it shows what the Host decided and reports attention back.
 *
 * It never classifies a session itself, so a card in the browser and a push on
 * the phone always describe the same moment.
 */
import type { Context } from '@deepseek-ai/cordis'
import type { PublicConfig } from '../core/config.ts'
import { readConfig, reportPresence } from './api.ts'
import { createSettingsModel } from './model.ts'
import { play, show } from './notify.ts'
import { subscribeNotifications } from './stream.ts'
import { NotificationsSection } from './settings/section.tsx'

export const name = 'dsh-notify-client'
export const inject = ['slots', 'uiWorkspace']

/** How often the browser re-states what the person is looking at. */
const PRESENCE_INTERVAL_MS = 20_000

/** The client surface this module consumes, declared structurally. */
interface ClientServices {
  readonly slots: {
    inject(name: string, register: () => unknown): unknown
    register(options: Record<string, unknown>, component: unknown): unknown
  }
  readonly uiWorkspace: { openSession(sessionId: string): void }
  effect(disposer: () => (() => void) | void, label?: string): unknown
}

/** Apply the client plugin. */
export function apply(ctx: Context): void {
  const services = ctx as unknown as ClientServices
  const model = createSettingsModel()
  void model.refresh()

  let live: PublicConfig | null = null
  model.subscribe(() => {
    const snapshot = model.getSnapshot()
    if (snapshot.config !== null) live = snapshot.config
  })

  services.effect(() => subscribeNotifications((event) => {
    void handle(event)
  }), 'dsh-notify: stream')

  async function handle(event: { id: string; kind: keyof PublicConfig['events']; title: string; body: string; sessionId: string }): Promise<void> {
    const config = live ?? await readConfig().catch(() => null)
    if (config === null || !config.browser.enabled) return
    if (alreadyShown(event.id)) return
    const kind = config.events[event.kind]
    if (kind === undefined || !kind.enabled) return
    play(kind.sound, config.browser.volume)
    show({
      title: event.title,
      body: event.body,
      tag: `dsh-notify:${event.kind}`,
      onActivate: () => services.uiWorkspace.openSession(event.sessionId),
    })
  }

  services.effect(() => {
    const send = (): void => {
      void reportPresence({
        visible: document.visibilityState === 'visible',
        focused: document.hasFocus(),
        sessionId: null,
      })
    }
    send()
    const timer = setInterval(send, PRESENCE_INTERVAL_MS)
    document.addEventListener('visibilitychange', send)
    window.addEventListener('focus', send)
    window.addEventListener('blur', send)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', send)
      window.removeEventListener('focus', send)
      window.removeEventListener('blur', send)
    }
  }, 'dsh-notify: presence')

  services.slots.inject('settings.section', () => services.slots.register({
    name: 'settings.section',
    id: 'dsh-notify',
    order: 41,
    label: () => sectionLabel(),
    inject: () => ({ model }),
  }, NotificationsSection))
}

/**
 * Whether another tab already showed this event.
 *
 * Several tabs share one Host stream; the first to see an event records it in
 * `localStorage`, and the rest stay quiet so one happening produces one card.
 */
function alreadyShown(id: string): boolean {
  const key = `dsh-notify:shown:${id}`
  try {
    if (localStorage.getItem(key) !== null) return true
    localStorage.setItem(key, String(Date.now()))
    return false
  } catch {
    return false
  }
}

/** The navigation label, in the reader's language. */
function sectionLabel(): string {
  return navigator.language.toLowerCase().startsWith('zh') ? '通知' : 'Notifications'
}
