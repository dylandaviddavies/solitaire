import { motion } from 'motion/react'
import { useColumnGap } from '../hooks/useColumnGap'
import { DROP_ZONE_HINT_INSET_RATIO } from '../lib/layout'
import { DASHED_PILE_OUTLINE } from './pileStyles'

// Fades + scales in when a drag begins and back out when it ends, rather
// than popping. The exit is a touch slower and eases in, so the outlines
// linger for a beat as the card settles. Requires an <AnimatePresence>
// wrapper (see PileSlot) for the exit to run.
const HIDDEN = { opacity: 0, scale: 0.94 }
const VISIBLE = { opacity: 1, scale: 1 }
const ENTER_TRANSITION = { duration: 0.16, ease: 'easeOut' } as const
const EXIT_TRANSITION = { duration: 0.22, ease: 'easeIn' } as const

/**
 * Neutral dashed outline drawn over any pile that could ever be a drop
 * destination while a card is dragged. Presentational only — `PileSlot`
 * owns the decision of whether to render it. Floats a third of the
 * current column gap outside the pile so neighbouring hints stay evenly
 * spaced instead of meeting edge-to-edge.
 */
export function DropZoneHint() {
  const inset = useColumnGap() * DROP_ZONE_HINT_INSET_RATIO
  return (
    <motion.div
      className={`pointer-events-none absolute z-20 border-slate-300/70 ${DASHED_PILE_OUTLINE}`}
      style={{ inset: -inset }}
      initial={HIDDEN}
      animate={VISIBLE}
      exit={{ ...HIDDEN, transition: EXIT_TRANSITION }}
      transition={ENTER_TRANSITION}
    />
  )
}
