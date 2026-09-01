import type { WastePile } from '../domain/piles/WastePile'
import type { PileInteractionProps } from '../lib/types'
import { CardView } from './CardView'
import { PileSlot } from './PileSlot'

interface WastePileViewProps extends PileInteractionProps {
  pile: WastePile
  /** Id of the card most recently drawn onto the waste, if any — that
   * specific card plays a face-down-to-face-up turn as it slides in. */
  justDrawnId?: string | null
}

export function WastePileView({
  pile,
  justDrawnId,
  onDrop,
  onClickMove,
  onActivate,
  onDragStart,
  onDragEnd,
}: WastePileViewProps) {
  const cards = pile.getCards()
  const top = cards[cards.length - 1]
  // The card just underneath the top one, if any — kept mounted (it's
  // keyed by id, so it's the very same instance that used to be the top
  // card), squarely behind the top card, so drawing or dragging the top
  // card away reveals a card that was quietly there the whole time
  // instead of the pile going instantly blank.
  const under = cards[cards.length - 2]

  return (
    <PileSlot pileId={pile.id} showPlaceholder={pile.isEmpty}>
      {under && (
        <div className="pointer-events-none">
          <CardView
            key={under.id}
            card={under}
            pileId={pile.id}
            draggable={false}
            style={{ top: 0, left: 0, zIndex: -1 }}
            onDrop={() => false}
            onClickMove={() => {}}
            onActivate={() => {}}
          />
        </div>
      )}
      {top && (
        <CardView
          // Without this key, React reuses one component instance as the
          // visible top card changes underneath it, so a freshly-drawn
          // card never gets its own mount to animate in from.
          key={top.id}
          card={top}
          pileId={pile.id}
          draggable={pile.canLift(top)}
          revealOnMount={top.id === justDrawnId}
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
