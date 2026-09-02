import { describe, expect, it } from 'vitest'
import { hrefWithSeed, hrefWithoutSeed, seedFromSearch } from './seedLink'

describe('seedFromSearch', () => {
  it('reads a numeric seed', () => {
    expect(seedFromSearch('?seed=12345')).toBe(12345)
    expect(seedFromSearch('?a=1&seed=42&b=2')).toBe(42)
  })

  it('is null when the param is absent or blank', () => {
    expect(seedFromSearch('')).toBeNull()
    expect(seedFromSearch('?seed=')).toBeNull()
    expect(seedFromSearch('?other=1')).toBeNull()
  })

  it('hashes a non-numeric seed, deterministically', () => {
    const first = seedFromSearch('?seed=canada-day')
    expect(first).not.toBeNull()
    expect(seedFromSearch('?seed=canada-day')).toBe(first)
    expect(seedFromSearch('?seed=other')).not.toBe(first)
  })
})

describe('hrefWithSeed', () => {
  it('round-trips through the query string', () => {
    const url = hrefWithSeed('https://x.test/solitaire/', 777)
    expect(url).toBe('https://x.test/solitaire/?seed=777')
    expect(seedFromSearch(new URL(url).search)).toBe(777)
  })

  it('replaces any existing query and hash', () => {
    expect(hrefWithSeed('https://x.test/s/?seed=1&z=2#deal', 9)).toBe('https://x.test/s/?seed=9')
  })
})

describe('hrefWithoutSeed', () => {
  it('removes just the seed param', () => {
    expect(hrefWithoutSeed('https://x.test/s/?seed=9&k=1')).toBe('https://x.test/s/?k=1')
  })

  it('is null when there is no seed param to strip', () => {
    expect(hrefWithoutSeed('https://x.test/s/')).toBeNull()
    expect(hrefWithoutSeed('https://x.test/s/?k=1')).toBeNull()
  })
})
