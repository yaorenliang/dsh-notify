/**
 * The settings page's single source of state.
 *
 * A tiny external store keeps the React tree free of transport details: the page
 * reads one snapshot and calls three commands, and every async answer lands back
 * in the same snapshot.
 */
import type { PublicConfig } from '../core/config.ts'
import type { HostState } from './api.ts'
import { readConfig, readState, testChannel, writeConfig } from './api.ts'
import { permission, requestPermission as askPermission, type Permission } from './notify.ts'

/** How long a success line stays on screen. */
const NOTICE_MS = 1600

/** Everything the page renders from. */
export interface SettingsSnapshot {
  /** The stored configuration, or null while the first read is in flight. */
  readonly config: PublicConfig | null
  /** Host status (attached streams, channel readiness), when read. */
  readonly state: HostState | null
  /** Browser notification permission. */
  readonly permission: Permission
  /** A command is in flight. */
  readonly busy: boolean
  /** The last failure, cleared by the next command. */
  readonly error: string | null
  /** A transient success line. */
  readonly notice: string | null
}

/** The commands the page can issue. */
export interface SettingsModel {
  getSnapshot(): SettingsSnapshot
  subscribe(listener: () => void): () => void
  refresh(): Promise<void>
  save(patch: unknown): Promise<void>
  test(channel: 'browser' | 'bark'): Promise<void>
  requestPermission(): Promise<void>
}

const INITIAL: SettingsSnapshot = {
  config: null,
  state: null,
  permission: permission(),
  busy: false,
  error: null,
  notice: null,
}

/** Create the model; the page owns no state of its own. */
export function createSettingsModel(): SettingsModel {
  let snapshot: SettingsSnapshot = INITIAL
  const listeners = new Set<() => void>()

  const set = (patch: Partial<SettingsSnapshot>): void => {
    snapshot = { ...snapshot, ...patch }
    for (const listener of listeners) listener()
  }

  const fail = (error: unknown): void => {
    set({ busy: false, error: error instanceof Error ? error.message : String(error), notice: null })
  }

  /**
   * Show a success line for a moment.
   *
   * The store owns the lifetime, not the page: a notice that outlived the save
   * that produced it reappears every time the section remounts, which reads as
   * "it saved again" when nothing happened.
   */
  let noticeTimer: ReturnType<typeof setTimeout> | undefined
  const announce = (notice: string | null): void => {
    if (noticeTimer !== undefined) clearTimeout(noticeTimer)
    if (notice === null) {
      set({ notice: null })
      return
    }
    set({ notice })
    noticeTimer = setTimeout(() => {
      noticeTimer = undefined
      set({ notice: null })
    }, NOTICE_MS)
  }

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    async refresh() {
      set({ busy: true, error: null })
      try {
        const [config, state] = await Promise.all([readConfig(), readState()])
        set({ config, state, busy: false, permission: permission() })
      } catch (error) {
        fail(error)
      }
    },
    async save(patch) {
      set({ busy: true, error: null, notice: null })
      try {
        const config = await writeConfig(patch)
        const state = await readState()
        set({ config, state, busy: false })
        announce('Saved')
      } catch (error) {
        fail(error)
      }
    },
    async test(channel) {
      set({ busy: true, error: null, notice: null })
      try {
        const result = await testChannel(channel)
        // The request can succeed while the channel refuses: the Host reports
        // "transport ok, push failed" and that must not read as a success.
        const refused = result.result !== undefined && !result.result.ok
        const accepted = result.ok && !refused
        set({
          busy: false,
          error: accepted ? null : result.result?.reason ?? `No ${channel} channel is ready`,
        })
        announce(accepted ? `Test sent on ${channel}` : null)
      } catch (error) {
        fail(error)
      }
    },
    async requestPermission() {
      const next = await askPermission()
      set({ permission: next })
    },
  }
}
