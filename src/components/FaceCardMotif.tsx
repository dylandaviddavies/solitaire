import { useMemo } from 'react'
import { buildFaceMotif, pointsToAttr } from '../lib/lowPoly'

interface FaceCardMotifProps {
  rank: 'J' | 'Q' | 'K'
  isRed: boolean
}

/**
 * Renders the procedural low-poly crown motif for a face card. Pure
 * presentation: all geometry comes from `buildFaceMotif`.
 */
export function FaceCardMotif({ rank, isRed }: FaceCardMotifProps) {
  const motif = useMemo(() => buildFaceMotif(rank), [rank])
  const baseHue = isRed ? 350 : 235
  const baseSat = isRed ? 78 : 55

  return (
    <svg viewBox={motif.viewBox} className="h-full w-full" aria-hidden="true">
      {motif.triangles.map((triangle, i) => {
        const lightness = 50 + triangle.shade * 22
        return (
          <polygon
            key={i}
            points={pointsToAttr(triangle.points)}
            fill={`hsl(${baseHue} ${baseSat}% ${lightness}%)`}
            stroke="rgba(255,255,255,0.35)"
            strokeWidth={0.6}
            strokeLinejoin="round"
          />
        )
      })}
      <polygon
        points={pointsToAttr(motif.outline)}
        fill="none"
        stroke="rgba(0,0,0,0.18)"
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
    </svg>
  )
}
