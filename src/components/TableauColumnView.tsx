import { useState } from 'react'
import type { TableauPile } from '../domain/piles/TableauPile'
import { CARD_HEIGHT } from '../lib/layout'
import { tableauOffsets } from '../lib/tableauLayout'
import type { PileInteractionProps } from '../lib/types'
import { CardView, type DragTransform } from './CardView'
import { PileSlot } from './PileSlot'

interface TableauColumnViewProps extends PileInteractionProps {
  pile: TableauPile
  /** Vertical space this column may occupy. When the run laid out at the
   * natural step would be taller, `tableauOffsets` squeezes the step to
   * fit so a long run stays fully on-screen instead of being clipped off
   * the bottom of the board. */
  maxHeight: number
}

/** Which card in this column is currently the base of a drag, and its live
 * motion values — so every card below it in the same run (a higher index;
 * `Pile.cards` runs bottom-of-stack-first) can mirror that exact position
 * instead of just sitting still while the card "above" them flies off. */
interface DragOrigin {
  index: number
  transform: DragTransform
}

export function TableauColumnView({
  pile,
  maxHeight,
  onDrop,
  onClickMove,
  onActivate,
  onDragStart,
  onDragEnd,
  isDropTarget,
}: TableauColumnViewProps) {
  const cards = pile.getCards()
  const [dragOrigin, setDragOrigin] = useState<DragOrigin | null>(null)

  const offsets = tableauOffsets(
    cards.map((card) => card.faceUp),
    maxHeight,
  )
  const lastTop = offsets[offsets.length - 1] ?? 0
  const totalHeight = Math.max(CARD_HEIGHT, lastTop + CARD_HEIGHT)

  return (
    <PileSlot
      pileId={pile.id}
      minHeight={totalHeight}
      showPlaceholder={pile.isEmpty}
      dropTarget={isDropTarget(pile.id)}
    >
      {cards.map((card, index) => {
        // A "follower" is any card stacked below the one actually being
        // dragged, within the same valid run — it doesn't drive its own
        // position, it just mirrors the dragged card's motion values so
        // the whole run visually moves as one unit.
        const isFollower = dragOrigin !== null && index > dragOrigin.index
        return (
          <CardView
            key={card.id}
            card={card}
            pileId={pile.id}
            draggable={pile.canLift(card)}
            style={{ top: offsets[index], left: 0, zIndex: index }}
            onDrop={onDrop}
            onClickMove={onClickMove}
            onActivate={onActivate}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onPressStart={(transform) => setDragOrigin({ index, transform })}
            onPressEnd={() => setDragOrigin(null)}
            followTransform={isFollower ? dragOrigin!.transform : undefined}
          />
        )
      })}
    </PileSlot>
  )
}
