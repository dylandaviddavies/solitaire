import { soundPreference } from './preferences'

/**
 * The sound kit: real sampled effects — Kenney's CC0 Casino / UI / Impact
 * packs (kenney.nl), converted to mp3 because Safari can't decode ogg —
 * plus the original synthesised blips, which are kept for the *musical*
 * cues a fixed sample can't provide (the foundation pitch ladder, the win
 * arpeggio) and as a fallback while a sample is still being fetched and
 * decoded. Fire-and-forget: `playSound('drop')`. Muted unless the sound
 * preference is on; the AudioContext is created (and resumed) lazily on
 * the first call, which is always inside a user gesture.
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
  | 'click'

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

// ---------------------------------------------------------------------------
// Sampled effects
// ---------------------------------------------------------------------------

// Vite resolves each file to a hashed URL; the PWA precache picks them up
// via the mp3 entry in vite.config.ts globPatterns, so they keep working
// offline.
const SOUND_URLS = import.meta.glob('../assets/sounds/*.mp3', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

/** The sample files whose basename starts with `prefix` — each play picks
 * one variant at random so rapid repeats don't sound stamped out. */
const pool = (prefix: string): string[] =>
  Object.keys(SOUND_URLS)
    .filter((path) => path.split('/').pop()!.startsWith(prefix))
    .sort()
    .map((path) => SOUND_URLS[path])

const SLIDES = pool('card-slide')
const PLACES = pool('card-place')
const SHOVES = pool('card-shove')
const SHUFFLES = pool('card-shuffle')
const CHIPS = pool('chips-stack')
const CLICKS = pool('ui-click')
const THUDS = pool('soft-thud')

const buffers = new Map<string, AudioBuffer>()
let preloadStarted = false

/** Fetches and decodes every sample once, kicked off by the first
 * `playSound` call. Until a buffer is ready its sound falls back to the
 * synth blip — which is inaudible pre-gesture anyway, since the context
 * starts suspended. A file that fails stays on the blip for the session. */
function preload(decodeCtx: AudioContext): void {
  if (preloadStarted) return
  preloadStarted = true
  for (const url of Object.values(SOUND_URLS)) {
    fetch(url)
      .then((res) => res.arrayBuffer())
      .then((data) => decodeCtx.decodeAudioData(data))
      .then((buffer) => buffers.set(url, buffer))
      .catch(() => {})
  }
}

interface SampleSpec {
  /** Variant pool — one is picked at random per play. */
  urls: string[]
  /** Peak gain, 0–1. */
  vol: number
  /** Playback-rate multiplier (pitch and speed together). 1 = as recorded. */
  rate?: number
  /** Seconds to wait before starting. */
  at?: number
}

/** Plays one random variant of `spec`, or returns false (caller falls back
 * to a blip) if that variant hasn't finished decoding yet. */
function sample(a: { ctx: AudioContext; master: GainNode }, spec: SampleSpec): boolean {
  const url = spec.urls[Math.floor(Math.random() * spec.urls.length)]
  const buffer = buffers.get(url)
  if (!buffer) return false
  const source = a.ctx.createBufferSource()
  source.buffer = buffer
  // A whisker of random detune on top of the variant pool, so the deal-in
  // and Auto Finish cascades don't sound machine-gun identical.
  source.playbackRate.value = (spec.rate ?? 1) * (0.97 + Math.random() * 0.06)
  const gain = a.ctx.createGain()
  gain.gain.value = spec.vol
  source.connect(gain).connect(a.master)
  source.start(a.ctx.currentTime + (spec.at ?? 0))
  return true
}

// ---------------------------------------------------------------------------
// Synthesised blips (musical cues + decode-time fallback)
// ---------------------------------------------------------------------------

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
  preload(a.ctx)

  switch (name) {
    case 'deal':
      if (!sample(a, { urls: SLIDES, vol: 0.35, rate: 1.5 })) {
        blip(a, { freq: 300 + Math.random() * 90, dur: 0.05, type: 'triangle', vol: 0.05, glide: 0.7 })
      }
      break
    case 'draw':
      if (!sample(a, { urls: SLIDES, vol: 0.8 })) {
        blip(a, { freq: 460, dur: 0.09, type: 'triangle', vol: 0.08, glide: 0.55 })
      }
      break
    case 'pickup':
      if (!sample(a, { urls: SHOVES, vol: 0.45, rate: 1.2 })) {
        blip(a, { freq: 300, dur: 0.08, type: 'sine', vol: 0.09, glide: 1.5 })
      }
      break
    case 'drop':
      if (!sample(a, { urls: PLACES, vol: 0.9 })) {
        blip(a, { freq: 220, dur: 0.11, type: 'sine', vol: 0.12, glide: 0.55 })
        blip(a, { freq: 1100, dur: 0.03, type: 'square', vol: 0.03 })
      }
      break
    case 'foundation': {
      // The tactile card-place under the climbing note — sample for the
      // touch, synth for the melody a fixed recording can't supply.
      sample(a, { urls: PLACES, vol: 0.5 })
      const scale = [0, 2, 4, 5, 7, 9, 11, 12] // major, one octave
      const semis = scale[step % scale.length] + 12 * Math.floor(step / scale.length)
      blip(a, { freq: note(semis + 12), dur: 0.18, type: 'sine', vol: 0.13 })
      blip(a, { freq: note(semis + 24), dur: 0.14, type: 'sine', vol: 0.04 })
      break
    }
    case 'invalid':
      // A dull "nope" knock, pitched down to read as refusal, not a landing.
      if (!sample(a, { urls: THUDS, vol: 0.8, rate: 0.75 })) {
        blip(a, { freq: 170, dur: 0.13, type: 'sawtooth', vol: 0.07, glide: 0.8 })
      }
      break
    case 'shuffle':
      if (!sample(a, { urls: SHUFFLES, vol: 0.9 })) {
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
      }
      break
    case 'click':
      if (!sample(a, { urls: CLICKS, vol: 0.5 })) {
        blip(a, { freq: 700, dur: 0.04, type: 'triangle', vol: 0.05 })
      }
      break
    case 'win': {
      // The chip payout rattling in under the arpeggio — pure casino.
      sample(a, { urls: CHIPS, vol: 0.6, at: 0.12 })
      const arp = [0, 4, 7, 12, 16, 19]
      arp.forEach((s, i) => {
        blip(a, { freq: note(s + 12), dur: 0.32, type: 'sine', vol: 0.12, at: i * 0.1 })
        blip(a, { freq: note(s + 24), dur: 0.28, type: 'triangle', vol: 0.03, at: i * 0.1 })
      })
      break
    }
  }
}
