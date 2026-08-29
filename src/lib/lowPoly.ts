/**
 * Procedural low-poly motif generator for face cards (J / Q / K).
 *
 * Rather than any illustrated or AI-generated artwork, each face card gets
 * a small geometric "crown" built from a triangle mesh: an outline is
 * generated from a spike count, fan-triangulated from a centroid, and each
 * facet gets a deterministic shade offset so it reads as a faceted, gem-like
 * low-poly shape rather than a flat icon.
 */

export interface Point {
  x: number
  y: number
}

export interface Triangle {
  points: [Point, Point, Point]
  /** -1..1, deterministic per-facet brightness offset. */
  shade: number
}

export interface LowPolyMotif {
  outline: Point[]
  triangles: Triangle[]
  viewBox: string
}

/** Small seeded PRNG (mulberry32) so a given rank's facets never shimmer between renders. */
function seededRandom(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function centroid(points: Point[]): Point {
  const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 })
  return { x: sum.x / points.length, y: sum.y / points.length }
}

/** Builds a crown-shaped outline: a flat base with `spikes` triangular peaks. */
function buildCrownOutline(spikes: number, width: number, height: number): Point[] {
  const baseY = height * 0.82
  const peakY = height * 0.14
  const valleyY = height * 0.4
  const points: Point[] = []

  points.push({ x: width * 0.08, y: baseY })
  points.push({ x: width * 0.08, y: valleyY })

  const span = width * 0.84
  const segment = span / (spikes * 2)
  for (let i = 0; i < spikes; i++) {
    const xStart = width * 0.08 + segment * (i * 2)
    const xPeak = xStart + segment
    const xEnd = xStart + segment * 2
    points.push({ x: xPeak, y: peakY })
    if (i < spikes - 1) {
      points.push({ x: xEnd, y: valleyY })
    }
  }

  points.push({ x: width * 0.92, y: valleyY })
  points.push({ x: width * 0.92, y: baseY })

  // A jeweled band along the base gives the fan-triangulation more facets
  // to work with near the bottom, which is where low-poly art reads best.
  const bandNotches = 5
  for (let i = bandNotches; i >= 0; i--) {
    const x = width * 0.08 + (span * i) / bandNotches
    const y = baseY - (i % 2 === 0 ? height * 0.06 : 0)
    points.push({ x, y })
  }

  return points
}

function triangulate(outline: Point[], seed: number): Triangle[] {
  const center = centroid(outline)
  const rand = seededRandom(seed)
  const triangles: Triangle[] = []
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i]
    const b = outline[(i + 1) % outline.length]
    triangles.push({
      points: [center, a, b],
      shade: rand() * 2 - 1,
    })
  }
  return triangles
}

const SPIKES_BY_RANK: Record<'J' | 'Q' | 'K', number> = { J: 1, Q: 3, K: 5 }
const SEED_BY_RANK: Record<'J' | 'Q' | 'K', number> = { J: 11, Q: 17, K: 23 }

export function buildFaceMotif(rank: 'J' | 'Q' | 'K'): LowPolyMotif {
  const width = 100
  const height = 100
  const outline = buildCrownOutline(SPIKES_BY_RANK[rank], width, height)
  const triangles = triangulate(outline, SEED_BY_RANK[rank])
  return { outline, triangles, viewBox: `0 0 ${width} ${height}` }
}

function pointsToAttr(points: Point[]): string {
  return points.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')
}

export { pointsToAttr }
