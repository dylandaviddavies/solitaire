import { parseSeed } from '../domain/rng'

/** Query-string key a shared deal travels in: `…/solitaire/?seed=12345`. */
const SEED_PARAM = 'seed'

// --- Pure helpers (string in, string out — unit-tested) ----------------

/** Pull a seed out of a URL query string, or `null` when it's absent or
 * blank. A non-numeric value still works: `parseSeed` hashes it, so
 * `?seed=canada-day` is a perfectly good shareable deal. */
export function seedFromSearch(search: string): number | null {
  const raw = new URLSearchParams(search).get(SEED_PARAM)
  return raw === null ? null : parseSeed(raw)
}

/** `href` with `?seed=<seed>` as its whole query (any existing query or
 * hash is dropped) — the link you hand someone to play your exact deal. */
export function hrefWithSeed(href: string, seed: number): string {
  const url = new URL(href)
  url.search = ''
  url.hash = ''
  url.searchParams.set(SEED_PARAM, String(seed))
  return url.toString()
}

/** `href` with the seed param stripped, or `null` when it had none — so a
 * caller can skip a pointless history write. */
export function hrefWithoutSeed(href: string): string | null {
  const url = new URL(href)
  if (!url.searchParams.has(SEED_PARAM)) return null
  url.searchParams.delete(SEED_PARAM)
  return url.toString()
}

// --- Location-bound conveniences (trivial wrappers) --------------------

/** The seed the current page was opened with, if any. */
export function seedFromLocation(): number | null {
  return seedFromSearch(window.location.search)
}

/** A shareable link to `seed` against wherever the app is currently served. */
export function shareableSeedUrl(seed: number): string {
  return hrefWithSeed(window.location.href, seed)
}

/** Drop `?seed=` from the address bar without navigating, once the shared
 * deal has been taken on board — from then on the player's saved game is
 * what a refresh resumes, not the link. */
export function stripSeedFromLocation(): void {
  const next = hrefWithoutSeed(window.location.href)
  if (next !== null) window.history.replaceState(null, '', next)
}
