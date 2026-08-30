interface FaceCardMotifProps {
  rank: 'J' | 'Q' | 'K'
  isRed: boolean
}

// A neutral, stylized token color for the head — deliberately not a skin
// tone, since this is an iconographic bust (like a chess piece), not a
// portrait.
const HEAD_FILL = '#f2dfc0'
const HEAD_SHADE = '#e2c89e'
const GOLD = '#f2c94c'
const GOLD_SHADE = '#d9a91f'

/**
 * Flat, chunky Jack/Queen/King illustrations: a simple bust (head +
 * shoulders) with rank-specific headwear, colored by suit. Built entirely
 * from basic shapes rather than photographic/portrait art, to match the
 * card face's bold, iconographic style.
 */
export function FaceCardMotif({ rank, isRed }: FaceCardMotifProps) {
  const accent = isRed ? '#e11d48' : '#1e293b'
  const accentShade = isRed ? '#be123c' : '#0f172a'

  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">
      {/* Shoulders / robe */}
      <path d="M 16 100 L 34 60 Q 50 68 66 60 L 84 100 Z" fill={accent} />
      <path d="M 34 60 Q 50 68 66 60 L 70 68 Q 50 76 30 68 Z" fill={accentShade} opacity={0.5} />
      {/* Collar */}
      <rect x="40" y="56" width="20" height="10" rx="3" fill={GOLD} />

      {/* Head */}
      <circle cx="50" cy="40" r="19" fill={HEAD_FILL} />
      <path d="M 31 40 A 19 19 0 0 0 45 58 A 24 24 0 0 1 31 40 Z" fill={HEAD_SHADE} opacity={0.6} />
      {/* Eyes */}
      <circle cx="43" cy="39" r="2.4" fill="#2b2b2b" />
      <circle cx="57" cy="39" r="2.4" fill="#2b2b2b" />
      {/* Simple smile */}
      <path d="M 44 48 Q 50 52 56 48" stroke="#2b2b2b" strokeWidth={1.6} fill="none" strokeLinecap="round" />

      {rank === 'K' && (
        <g>
          <path
            d="M 27 26 L 33 8 L 42 20 L 50 6 L 58 20 L 67 8 L 73 26 Z"
            fill={GOLD}
            stroke={GOLD_SHADE}
            strokeWidth={1.2}
            strokeLinejoin="round"
          />
          <rect x="27" y="24" width="46" height="7" rx="2" fill={GOLD} stroke={GOLD_SHADE} strokeWidth={1} />
          <circle cx="33" cy="16" r="2.6" fill={accent} />
          <circle cx="67" cy="16" r="2.6" fill={accent} />
          <path d="M 50 3 L 50 11 M 46.5 7 L 53.5 7" stroke={GOLD_SHADE} strokeWidth={2.2} strokeLinecap="round" />
        </g>
      )}

      {rank === 'Q' && (
        <g>
          {/* Flowing side hair */}
          <path d="M 29 32 Q 20 46 27 62 Q 33 50 34 38 Z" fill={accent} opacity={0.85} />
          <path d="M 71 32 Q 80 46 73 62 Q 67 50 66 38 Z" fill={accent} opacity={0.85} />
          <path
            d="M 30 24 Q 38 10 50 16 Q 62 10 70 24 Q 62 18 50 24 Q 38 18 30 24 Z"
            fill={GOLD}
            stroke={GOLD_SHADE}
            strokeWidth={1.2}
            strokeLinejoin="round"
          />
          <rect x="30" y="22" width="40" height="6" rx="2" fill={GOLD} stroke={GOLD_SHADE} strokeWidth={1} />
          <circle cx="50" cy="19" r="2.8" fill={accent} />
        </g>
      )}

      {rank === 'J' && (
        <g>
          {/* Flat cap */}
          <path d="M 30 26 Q 50 10 70 26 Q 70 30 50 30 Q 30 30 30 26 Z" fill={accent} />
          <ellipse cx="50" cy="26" rx="21" ry="4.2" fill={accentShade} />
          <circle cx="68" cy="23" r="3" fill={GOLD} />
        </g>
      )}
    </svg>
  )
}
