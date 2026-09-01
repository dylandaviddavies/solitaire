/**
 * Seeded randomness so a deal can be replayed. `mulberry32` is a small,
 * fast PRNG with good-enough distribution for a card shuffle; the same
 * seed always produces the same 52-card order.
 */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A fresh random seed — a positive integer short enough to read out and
 * share. */
export function randomSeed(): number {
  return 1 + Math.floor(Math.random() * 999_999_999)
}

/**
 * Turn whatever the player typed into a usable seed, or `null` if the
 * field is empty. A plain positive integer is taken as-is; anything else
 * (a word, a phrase) is hashed so it still maps to one stable deal.
 */
export function parseSeed(input: string): number | null {
  const text = input.trim()
  if (!text) return null
  const asNumber = Number(text)
  if (Number.isInteger(asNumber) && asNumber > 0 && asNumber <= 0xffffffff) return asNumber
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) || 1
}
