import { useState } from 'react'
import type { TableauPile } from '../domain/piles/TableauPile'
import { TABLEAU_OFFSET_FACE_DOWN, TABLEAU_OFFSET_FACE_UP, CARD_HEIGHT } from '../lib/layout'
import type { PileInteractionProps } from '../lib/types'
import { CardView, type DragTransform } from './CardView'
import { PileSlot } from './PileSlot'

interface TableauColumnViewProps extends PileInteractionProps {
  pile: TableauPile
}

/** Which card in this column is currently the base of a drag, and its live
 * motion values — so every card below it in the same run (a higher index;
 * `Pile.cards` runs bottom-of-stack-first) can mirror that exact position
 * instead of just sitting still while the card "above" them flies off. */
interface DragOrigin {
  index: number
  transform: DragTransform
}

/** The run whose head was last tapped, so the rest of the run can wiggle
 * along with it. `nonce` bumps on every tap so a repeat tap replays. */
interface TapPulse {
  fromIndex: number
  nonce: number
}

export function TableauColumnView({
  pile,
  onDrop,
  onClickMove,
  onActivate,
  onDragStart,
  onDragEnd,
  isDropTarget,
}: TableauColumnViewProps) {
  const cards = pile.getCards()
  const [dragOrigin, setDragOrigin] = useState<DragOrigin | null>(null)
  const [tapPulse, setTapPulse] = useState<TapPulse | null>(null)

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
    >
      {cards.map((card, index) => {
        // A "follower" is any card stacked below the one actually being
        // dragged, within the same valid run — it doesn't drive its own
        // position, it just mirrors the dragged card's motion values so
        // the whole run visually moves as one unit.
        const isFollower = dragOrigin !== null && index > dragOrigin.index
        // A tap on a run head wiggles the head (via its own onClick) plus
        // every card below it in the run, cascading down the fan.
        const inTappedRun = tapPulse !== null && index > tapPulse.fromIndex
        return (
          <CardView
            key={card.id}
            card={card}
            pileId={pile.id}
            draggable={pile.canLift(card)}
            style={{ top: offsets[index], left: 0, zIndex: index }}
            onDrop={onDrop}
            onClickMove={(tappedCard) => {
              setTapPulse((prev) => ({ fromIndex: index, nonce: (prev?.nonce ?? 0) + 1 }))
              onClickMove(tappedCard)
            }}
            onActivate={onActivate}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onPressStart={(transform) => setDragOrigin({ index, transform })}
            onPressEnd={() => setDragOrigin(null)}
            followTransform={isFollower ? dragOrigin!.transform : undefined}
            groupWiggle={
              inTappedRun
                ? { nonce: tapPulse!.nonce, order: index - tapPulse!.fromIndex }
                : undefined
            }
          />
        )
      })}
    </PileSlot>
  )
}
