import { motion } from 'motion/react'

const SPARKLE_COUNT = 7
// How far each spark flies from the card's centre, and how long the whole
// burst lasts. Kept small — this is a garnish on a landing, not fireworks.
const SPREAD_PX = 34
const DURATION_S = 0.5

const SPARKS = Array.from({ length: SPARKLE_COUNT }, (_, i) => {
  const angle = (i / SPARKLE_COUNT) * Math.PI * 2
  return { x: Math.cos(angle) * SPREAD_PX, y: Math.sin(angle) * SPREAD_PX }
})

interface SparkleBurstProps {
  /** Called once the last spark has faded, so the parent can unmount it. */
  onComplete?: () => void
}

/**
 * A quick radial pop of little sparks, fired when a card lands in a new
 * pile. Purely decorative and self-cleaning — it renders nothing lasting
 * and asks to be unmounted via `onComplete` when the animation ends.
 */
export function SparkleBurst({ onComplete }: SparkleBurstProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
      {SPARKS.map((spark, i) => (
        <motion.span
          key={i}
          className="absolute h-1.5 w-1.5 rounded-full bg-amber-200 shadow-[0_0_6px_2px_rgba(253,230,138,0.7)]"
          initial={{ opacity: 0, scale: 0.4, x: 0, y: 0 }}
          animate={{ opacity: [0, 1, 0], scale: [0.4, 1, 0.5], x: spark.x, y: spark.y }}
          transition={{ duration: DURATION_S, ease: 'easeOut' }}
          onAnimationComplete={i === SPARKS.length - 1 ? onComplete : undefined}
        />
      ))}
    </div>
  )
}
