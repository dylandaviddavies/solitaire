type Listener = () => void

export interface Score {
  /** Milliseconds from deal to win. */
  elapsedMs: number
  moves: number
  seed: number
  /** When it was set. */
  at: number
}

export interface HighScores {
  /** Best win across every deal. */
  general: Score | null
  /** Best win on each specific seed, keyed by `String(seed)`. */
  bySeed: Readonly<Record<string, Score>>
}

const STORAGE_KEY = 'solitaire:highScores'
const EMPTY: HighScores = { general: null, bySeed: {} }

/** Lower time wins; a tie is broken by fewer moves. */
export function isBetter(candidate: Score, best: Score | null): boolean {
  if (!best) return true
  if (candidate.elapsedMs !== best.elapsedMs) return candidate.elapsedMs < best.elapsedMs
  return candidate.moves < best.moves
}

function isScore(v: unknown): v is Score {
  if (!v || typeof v !== 'object') return false
  const s = v as Record<string, unknown>
  return (
    typeof s.elapsedMs === 'number' &&
    typeof s.moves === 'number' &&
    typeof s.seed === 'number' &&
    typeof s.at === 'number'
  )
}

function read(): HighScores {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const general = isScore(parsed.general) ? parsed.general : null
    const bySeed: Record<string, Score> = {}
    if (parsed.bySeed && typeof parsed.bySeed === 'object') {
      for (const [key, value] of Object.entries(parsed.bySeed as Record<string, unknown>)) {
        if (isScore(value)) bySeed[key] = value
      }
    }
    return { general, bySeed }
  } catch {
    return EMPTY
  }
}

let cache: HighScores = typeof window === 'undefined' ? EMPTY : read()
const listeners = new Set<Listener>()
const notify = () => listeners.forEach((l) => l())

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY) return
    cache = read()
    notify()
  })
}

export const highScores = {
  /** Cheap synchronous read, safe in render. */
  get: () => cache,
  subscribe: (listener: Listener) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  /**
   * Files a completed game. Updates the general best and the seed's own
   * best if it beats them, and reports which (for the "new best" badges).
   */
  record(score: Score): { general: boolean; seed: boolean } {
    const seedKey = String(score.seed)
    const beatGeneral = isBetter(score, cache.general)
    const beatSeed = isBetter(score, cache.bySeed[seedKey] ?? null)
    if (!beatGeneral && !beatSeed) return { general: false, seed: false }

    cache = {
      general: beatGeneral ? score : cache.general,
      bySeed: beatSeed ? { ...cache.bySeed, [seedKey]: score } : cache.bySeed,
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache))
    } catch {
      // In-memory value still applies for the rest of this session.
    }
    notify()
    return { general: beatGeneral, seed: beatSeed }
  },
}
