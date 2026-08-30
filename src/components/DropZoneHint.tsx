import { motion } from 'motion/react'
import { DROP_ZONE_HINT_INSET } from '../lib/layout'
import { DASHED_PILE_OUTLINE } from './pileStyles'

// Motion for the hint fading + settling in when a drag begins, rather
// than popping in hard. Tuned to be quick enough not to lag the drag.
const ENTER_FROM = { opacity: 0, scale: 0.94 }
const ENTER_TO = { opacity: 1, scale: 1 }
const ENTER_TRANSITION = { duration: 0.16, ease: 'easeOut' } as const

/**
 * Neutral dashed outline drawn over any pile that could ever be a drop
 * destination while a card is dragged. Presentational only — `PileSlot`
 * owns the decision of whether to render it. Sits `DROP_ZONE_HINT_INSET`
 * outside the pile so neighbouring hints stay evenly spaced instead of
 * meeting edge-to-edge.
 */
export function DropZoneHint() {
  return (
    <motion.div
      className={`pointer-events-none absolute z-20 border-slate-300/70 ${DASHED_PILE_OUTLINE}`}
      style={{ inset: -DROP_ZONE_HINT_INSET }}
      initial={ENTER_FROM}
      animate={ENTER_TO}
      transition={ENTER_TRANSITION}
    />
  )
}
