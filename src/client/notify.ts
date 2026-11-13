/**
 * The two things a browser channel can do: show a system notification and make
 * a sound. Both degrade to a no-op instead of throwing, because a notification
 * that cannot be shown must never break the page.
 */
import type { SoundId } from '../core/config.ts'

/** Notification permission, with `unsupported` for environments without the API. */
export type Permission = 'granted' | 'denied' | 'default' | 'unsupported'

/** The current permission state. */
export function permission(): Permission {
  if (typeof Notification === 'undefined') return 'unsupported'
  return Notification.permission
}

/** Ask for permission; call from a user gesture so the prompt is allowed. */
export async function requestPermission(): Promise<Permission> {
  if (typeof Notification === 'undefined') return 'unsupported'
  return Notification.requestPermission()
}

/** What a notification needs from the page. */
export interface ShowOptions {
  readonly title: string
  readonly body: string
  /** Collapse key: alerts of one kind collapse, a new kind re-alerts. */
  readonly tag: string
  /** Click action, run after the page is focused. */
  readonly onActivate: () => void
}

/** Show one system notification; returns whether it was shown. */
export function show(options: ShowOptions): boolean {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return false
  try {
    const note = new Notification(options.title, {
      body: options.body,
      tag: options.tag,
      silent: true,
    })
    note.onclick = () => {
      window.focus()
      options.onActivate()
      note.close()
    }
    return true
  } catch {
    return false
  }
}

/** Tone recipes, one per built-in sound. */
interface Tone {
  readonly frequency: number
  readonly duration: number
  readonly delay: number
  readonly type: OscillatorType
}

export const SOUNDS: Readonly<Record<SoundId, readonly Tone[]>> = {
  chime: [
    { frequency: 880, duration: 0.12, delay: 0, type: 'sine' },
    { frequency: 1320, duration: 0.18, delay: 0.1, type: 'sine' },
  ],
  fault: [
    { frequency: 440, duration: 0.16, delay: 0, type: 'triangle' },
    { frequency: 330, duration: 0.24, delay: 0.14, type: 'triangle' },
  ],
  pop: [{ frequency: 740, duration: 0.14, delay: 0, type: 'sine' }],
  alert: [
    { frequency: 660, duration: 0.1, delay: 0, type: 'sine' },
    { frequency: 660, duration: 0.1, delay: 0.14, type: 'sine' },
    { frequency: 990, duration: 0.14, delay: 0.28, type: 'sine' },
  ],
}

let context: AudioContext | null = null

/** Lazily create (and resume) the audio context. */
function audio(): AudioContext | null {
  if (typeof AudioContext === 'undefined') return null
  context ??= new AudioContext()
  if (context.state === 'suspended') void context.resume()
  return context
}

/** Play one built-in sound; silent when the volume is zero. */
export function play(sound: SoundId, volume: number): void {
  const ctx = audio()
  if (ctx === null || volume <= 0) return
  const start = ctx.currentTime
  for (const tone of SOUNDS[sound]) {
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.type = tone.type
    oscillator.frequency.value = tone.frequency
    const at = start + tone.delay
    gain.gain.setValueAtTime(0, at)
    gain.gain.linearRampToValueAtTime(Math.min(0.35, volume * 0.35), at + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, at + tone.duration)
    oscillator.connect(gain).connect(ctx.destination)
    oscillator.start(at)
    oscillator.stop(at + tone.duration + 0.02)
  }
}
