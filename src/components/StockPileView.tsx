import { motion } from 'motion/react'
import type { StockPile } from '../domain/piles/StockPile'
import { CardView } from './CardView'
import { PileSlot } from './PileSlot'

interface StockPileViewProps {
  pile: StockPile
  onDraw: () => void
}

export function StockPileView({ pile, onDraw }: StockPileViewProps) {
  const cards = pile.getCards()
  const top = cards[cards.length - 1]
  // A face-down peek of the next card down, kept mounted the same way as
  // the waste pile does — squarely behind the top card (no offset), so the
  // deck doesn't visually "empty out" a beat early right before the last
  // card is drawn.
  const under = cards[cards.length - 2]

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
      {under && (
        <div className="pointer-events-none">
          <CardView
            key={under.id}
            card={under}
            pileId={pile.id}
            draggable={false}
            style={{ top: 0, left: 0, zIndex: -1 }}
          />
        </div>
      )}
      {top && (
        <CardView
          // Keyed by id so each card gets its own mount/unmount as the
          // top of the deck changes (28 times in the opening deal alone) —
          // a shared instance would rob the arriving card of the fresh
          // mount its glide-in animation rides on.
          key={top.id}
          card={top}
          pileId={pile.id}
          draggable={false}
          style={{ top: 0, left: 0, zIndex: 0 }}
          onClickMove={onDraw}
        />
      )}
    </PileSlot>
  )
}
