import { Suit } from '../domain/Card'
import type { FoundationPile } from '../domain/piles/FoundationPile'
import type { PileInteractionProps } from '../lib/types'
import { CardView } from './CardView'
import { PileSlot } from './PileSlot'

const SUIT_GLYPH: Record<Suit, string> = {
  [Suit.Hearts]: '♥',
  [Suit.Diamonds]: '♦',
  [Suit.Clubs]: '♣',
  [Suit.Spades]: '♠',
}

interface FoundationSlotViewProps extends PileInteractionProps {
  pile: FoundationPile
}

export function FoundationSlotView({
  pile,
  onDrop,
  onClickMove,
  onActivate,
  onDragStart,
  onDragEnd,
  isDropTarget,
}: FoundationSlotViewProps) {
  const cards = pile.getCards()
  const top = cards[cards.length - 1]
  // The card just underneath the top one, if any — kept mounted (same
  // instance, since it's keyed by id) and peeking out slightly behind the
  // top card. Without this, dragging the top card off a foundation (this
  // game allows it) made the previous card underneath just pop into
  // existence a moment later instead of having been quietly there all
  // along.
  const under = cards[cards.length - 2]

  return (
    <PileSlot
      pileId={pile.id}
      showPlaceholder={pile.isEmpty}
      dropTarget={isDropTarget(pile.id)}
      placeholder={
        <div className="flex h-full w-full items-center justify-center text-3xl text-white/40">
          {SUIT_GLYPH[pile.suit]}
        </div>
      }
    >
      {under && (
        <div className="pointer-events-none">
          <CardView
            key={under.id}
            card={under}
            pileId={pile.id}
            draggable={false}
            style={{ top: 3, left: 2, zIndex: -1 }}
            onDrop={() => false}
            onClickMove={() => {}}
            onActivate={() => {}}
          />
        </div>
      )}
      {top && (
        <CardView
          // See StockPileView for why this key matters: without it React
          // reuses one component instance as the visible top card changes
          // underneath it, which conflicts with Motion's layoutId-based
          // transitions.
          key={top.id}
          card={top}
          pileId={pile.id}
          draggable={pile.canLift(top)}
          style={{ top: 0, left: 0, zIndex: 0 }}
          onDrop={onDrop}
          onClickMove={onClickMove}
          onActivate={onActivate}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        />
      )}
    </PileSlot>
  )
}
