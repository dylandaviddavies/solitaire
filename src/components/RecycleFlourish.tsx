import { motion } from 'motion/react'
import { useCardBackPreference } from '../hooks/useCardBackPreference'
import { RECYCLE_GHOSTS, RECYCLE_STAGGER_MS, RECYCLE_SWEEP } from '../lib/animation'
import { CARD_HEIGHT, CARD_WIDTH } from '../lib/layout'
import { CardBack } from './CardBack'

interface RecycleFlourishProps {
  /** Bumped once per waste→stock recycle; `0` means it has never happened.
   * Re-keying on it remounts the ghosts so they replay. */
  nonce: number
  /** Board-space x the ghosts sweep from (the waste slot) and to (the
   * stock slot), in the stock/waste row's own coordinates. */
  fromX: number
  toX: number
  /** Skip the whole thing under reduced motion — the real cards still
   * re-stack, just without the sweep. */
  enabled: boolean
}

/**
 * The decorative sweep played when the waste pile is turned back over into
 * the stock: a few card-backs arc from the waste slot onto the stock,
 * staggered, and square up. The engine has already moved the real cards;
 * this is pure garnish and never takes pointer events.
 */
export function RecycleFlourish({ nonce, fromX, toX, enabled }: RecycleFlourishProps) {
  const cardBack = useCardBackPreference()
  if (nonce === 0 || !enabled) return null

  return (
    <div
      key={nonce}
      className="pointer-events-none absolute left-0 top-0"
      style={{ width: CARD_WIDTH, height: CARD_HEIGHT, zIndex: 60 }}
    >
      {Array.from({ length: RECYCLE_GHOSTS }, (_, i) => (
        <motion.div
          key={i}
          className="absolute inset-0 rounded-[14px] shadow-[0_10px_22px_rgba(0,0,0,0.4)]"
          initial={{ x: fromX, rotate: -7 + i * 3.5, opacity: 0 }}
          animate={{
            x: [fromX, toX, toX],
            rotate: [-7 + i * 3.5, i % 2 ? 4 : -4, 0],
            opacity: [0, 0.9, 0.9, 0],
          }}
          transition={{
            ...RECYCLE_SWEEP,
            delay: (i * RECYCLE_STAGGER_MS) / 1000,
            times: [0, 0.62, 0.82, 1],
          }}
        >
          <CardBack variant={cardBack} />
        </motion.div>
      ))}
    </div>
  )
}
