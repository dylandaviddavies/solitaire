import { useState } from 'react'
import type { TableauPile } from '../domain/piles/TableauPile'
import {
  CARD_HEIGHT,
  TABLEAU_OFFSET_FACE_DOWN,
  TABLEAU_OFFSET_FACE_UP,
  TABLEAU_OFFSET_FACE_UP_MIN,
} from '../lib/layout'
import type { PileInteractionProps } from '../lib/types'
import { CardView, type DragTransform } from './CardView'
import { PileSlot } from './PileSlot'

interface TableauColumnViewProps extends PileInteractionProps {
  pile: TableauPile
  /** Vertical space this column may occupy. When the run laid out at the
   * natural step would be taller, the step is squeezed to fit — face-up
   * first (its overlap is redundant), face-down only if that's still not
   * enough — so a long run stays fully on-screen instead of being clipped
   * off the bottom of the board. */
  maxHeight: number
}

/** The vertical step between each pair of stacked cards, after any squeeze
 * needed to keep `cardCount` cards inside `maxHeight`. */
function fanSteps(faceDownBelow: number, faceUpBelow: number, maxHeight: number) {
  let faceDown = TABLEAU_OFFSET_FACE_DOWN
  let faceUp = TABLEAU_OFFSET_FACE_UP
  const room = maxHeight - CARD_HEIGHT // the last card carries no step
  const natural = faceDownBelow * faceDown + faceUpBelow * faceUp
  if (natural <= room) return { faceDown, faceUp }

  faceUp = faceUpBelow > 0
    ? Math.max(TABLEAU_OFFSET_FACE_UP_MIN, (room - faceDownBelow * faceDown) / faceUpBelow)
    : faceUp
  if (faceDownBelow > 0 && faceDownBelow * faceDown + faceUpBelow * faceUp > room) {
    faceDown = Math.max(2, (room - faceUpBelow * faceUp) / faceDownBelow)
  }
  return { faceDown, faceUp }
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

  // Only the cards with something stacked on them contribute a step.
  const below = cards.slice(0, -1)
  const { faceDown, faceUp } = fanSteps(
    below.filter((c) => !c.faceUp).length,
    below.filter((c) => c.faceUp).length,
    maxHeight,
  )

  const offsets: number[] = []
  let running = 0
  for (const card of cards) {
    offsets.push(running)
    running += card.faceUp ? faceUp : faceDown
  }
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
