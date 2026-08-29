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

export function FoundationSlotView({ pile, selected, onDrop, onSelect, onActivate }: FoundationSlotViewProps) {
  const top = pile.top

  return (
    <PileSlot
      pileId={pile.id}
      showPlaceholder={pile.isEmpty}
      placeholder={
        <div className="flex h-full w-full items-center justify-center text-3xl text-white/40">
          {SUIT_GLYPH[pile.suit]}
        </div>
      }
      onClick={() => {
        if (selected) onDrop(selected.card, pile.id)
      }}
    >
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
          selected={selected?.card === top}
          style={{ top: 0, left: 0, zIndex: 0 }}
          onDrop={onDrop}
          onSelect={onSelect}
          onActivate={onActivate}
        />
      )}
    </PileSlot>
  )
}
