import type { TableauPile } from '../domain/piles/TableauPile'
import { TABLEAU_OFFSET_FACE_DOWN, TABLEAU_OFFSET_FACE_UP, CARD_HEIGHT } from '../lib/layout'
import type { PileInteractionProps } from '../lib/types'
import { CardView } from './CardView'
import { PileSlot } from './PileSlot'

interface TableauColumnViewProps extends PileInteractionProps {
  pile: TableauPile
}

export function TableauColumnView({
  pile,
  selected,
  onDrop,
  onSelect,
  onActivate,
  onDragStart,
  onDragEnd,
  isDropTarget,
}: TableauColumnViewProps) {
  const cards = pile.getCards()

  const offsets: number[] = []
  let running = 0
  for (const card of cards) {
    offsets.push(running)
    running += card.faceUp ? TABLEAU_OFFSET_FACE_UP : TABLEAU_OFFSET_FACE_DOWN
  }
  const totalHeight = Math.max(CARD_HEIGHT, running + CARD_HEIGHT - (cards.length ? 0 : 0))

  return (
    <PileSlot
      pileId={pile.id}
      minHeight={totalHeight}
      showPlaceholder={pile.isEmpty}
      dropTarget={isDropTarget(pile.id)}
      onClick={() => {
        if (selected) onDrop(selected.card, pile.id)
      }}
    >
      {cards.map((card, index) => (
        <CardView
          key={card.id}
          card={card}
          pileId={pile.id}
          draggable={pile.canLift(card)}
          selected={selected?.card === card}
          style={{ top: offsets[index], left: 0, zIndex: index }}
          onDrop={onDrop}
          onSelect={onSelect}
          onActivate={onActivate}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        />
      ))}
    </PileSlot>
  )
}
