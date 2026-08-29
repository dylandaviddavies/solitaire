import { motion } from 'motion/react'
import type { StockPile } from '../domain/piles/StockPile'
import { CardView } from './CardView'
import { PileSlot } from './PileSlot'

interface StockPileViewProps {
  pile: StockPile
  onDraw: () => void
}

export function StockPileView({ pile, onDraw }: StockPileViewProps) {
  const top = pile.top

  return (
    <PileSlot
      pileId={pile.id}
      showPlaceholder={pile.isEmpty}
      placeholder={
        <motion.div
          className="flex h-full w-full items-center justify-center text-2xl text-white/50"
          whileHover={{ scale: 1.08 }}
        >
          ↻
        </motion.div>
      }
      onClick={onDraw}
    >
      {top && (
        <CardView
          // Without this, React reuses the same component instance as
          // the stock's top card changes underneath it (it changes 28
          // times during the initial deal alone), which hands Motion's
          // layoutId a changing value on an already-mounted instance
          // instead of a clean mount/unmount pair — that can leave the
          // card's opacity stuck mid-transition. Keying by id forces a
          // fresh instance per card.
          key={top.id}
          card={top}
          pileId={pile.id}
          draggable={false}
          selected={false}
          style={{ top: 0, left: 0, zIndex: 0 }}
          onDrop={() => false}
          onSelect={onDraw}
          onActivate={() => {}}
        />
      )}
    </PileSlot>
  )
}
