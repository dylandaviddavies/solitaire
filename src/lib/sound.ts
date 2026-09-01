import { soundPreference } from './preferences'

/**
 * A tiny synthesised sound kit — every effect is a short oscillator blip
 * built on the fly, so there are no audio assets to ship. Fire-and-forget:
 * `playSound('drop')`. Muted unless the sound preference is on, and the
 * AudioContext is created (and resumed) lazily on the first call, which is
 * always inside a user gesture.
 */

type SoundName =
  | 'deal'
  | 'draw'
  | 'pickup'
  | 'drop'
  | 'foundation'
  | 'invalid'
  | 'shuffle'
  | 'win'

let ctx: AudioContext | null = null
let master: GainNode | null = null

function audio(): { ctx: AudioContext; master: GainNode } | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    ctx = new Ctor()
    master = ctx.createGain()
    master.gain.value = 0.7
    master.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return { ctx, master: master! }
}

interface BlipSpec {
  /** Start frequency (Hz). */
  freq: number
  /** Seconds. */
  dur: number
  type?: OscillatorType
  /** Peak gain, 0–1. */
  vol?: number
  /** Multiply `freq` by this over the blip's life (glide). 1 = flat. */
  glide?: number
  /** Seconds to wait before starting. */
  at?: number
}

function blip(a: { ctx: AudioContext; master: GainNode }, spec: BlipSpec) {
  const { ctx, master } = a
  const t0 = ctx.currentTime + (spec.at ?? 0)
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = spec.type ?? 'sine'
  osc.frequency.setValueAtTime(spec.freq, t0)
  if (spec.glide && spec.glide !== 1) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, spec.freq * spec.glide), t0 + spec.dur)
  }
  const peak = spec.vol ?? 0.12
  gain.gain.setValueAtTime(0.0001, t0)
  gain.gain.linearRampToValueAtTime(peak, t0 + 0.006)
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + spec.dur)
  osc.connect(gain).connect(master)
  osc.start(t0)
  osc.stop(t0 + spec.dur + 0.03)
}

/** Semitones above middle C → Hz. */
const note = (semitones: number) => 261.63 * 2 ** (semitones / 12)

/**
 * `foundation` takes the running count of cards already home (0-based) so
 * the pitch climbs a scale as the game fills — a satisfying ladder during
 * Auto Finish. Other names ignore their argument.
 */
export function playSound(name: SoundName, step = 0) {
  if (soundPreference.get() !== 'on') return
  const a = audio()
  if (!a) return

  switch (name) {
    case 'deal':
      blip(a, { freq: 300 + Math.random() * 90, dur: 0.05, type: 'triangle', vol: 0.05, glide: 0.7 })
      break
    case 'draw':
      blip(a, { freq: 460, dur: 0.09, type: 'triangle', vol: 0.08, glide: 0.55 })
      break
    case 'pickup':
      blip(a, { freq: 300, dur: 0.08, type: 'sine', vol: 0.09, glide: 1.5 })
      break
    case 'drop':
      blip(a, { freq: 220, dur: 0.11, type: 'sine', vol: 0.12, glide: 0.55 })
      blip(a, { freq: 1100, dur: 0.03, type: 'square', vol: 0.03 })
      break
    case 'foundation': {
      const scale = [0, 2, 4, 5, 7, 9, 11, 12] // major, one octave
      const semis = scale[step % scale.length] + 12 * Math.floor(step / scale.length)
      blip(a, { freq: note(semis + 12), dur: 0.18, type: 'sine', vol: 0.13 })
      blip(a, { freq: note(semis + 24), dur: 0.14, type: 'sine', vol: 0.04 })
      break
    }
    case 'invalid':
      blip(a, { freq: 170, dur: 0.13, type: 'sawtooth', vol: 0.07, glide: 0.8 })
      break
    case 'shuffle':
      for (let i = 0; i < 7; i++) {
        blip(a, {
          freq: 240 + Math.random() * 220,
          dur: 0.04,
          type: 'triangle',
          vol: 0.04,
          glide: 0.7,
          at: i * 0.035,
        })
      }
      break
    case 'win': {
      const arp = [0, 4, 7, 12, 16, 19]
      arp.forEach((s, i) => {
        blip(a, { freq: note(s + 12), dur: 0.32, type: 'sine', vol: 0.12, at: i * 0.1 })
        blip(a, { freq: note(s + 24), dur: 0.28, type: 'triangle', vol: 0.03, at: i * 0.1 })
      })
      break
    }
  }
}
