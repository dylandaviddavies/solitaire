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
  // the waste/foundation piles do — mostly so the deck reads as an actual
  // stack rather than a single flat card, and so it doesn't visually
  // "empty out" a beat early right before the last card is drawn.
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
            sharedLayout={false}
            style={{ top: 3, left: 2, zIndex: -1 }}
            onDrop={() => false}
            onClickMove={() => {}}
            onActivate={() => {}}
          />
        </div>
      )}
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
          // Clicking the stock is a draw, not a card pickup — skip the
          // press lift so the top card flips straight to the waste
          // instead of raising and snapping back first. And keep it out
          // of the shared-layout system so the drawn card flips in place
          // on the waste rather than sliding over from the deck.
          liftOnPress={false}
          sharedLayout={false}
          style={{ top: 0, left: 0, zIndex: 0 }}
          onDrop={() => false}
          onClickMove={onDraw}
          onActivate={() => {}}
        />
      )}
    </PileSlot>
  )
}
