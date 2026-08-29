import type { WastePile } from '../domain/piles/WastePile'
import type { PileInteractionProps } from '../lib/types'
import { CardView } from './CardView'
import { PileSlot } from './PileSlot'

interface WastePileViewProps extends PileInteractionProps {
  pile: WastePile
  /** Id of the card most recently dealt onto the waste, if any — that
   * specific card plays a face-down-to-face-up flip on mount. */
  justDrawnId?: string | null
}

export function WastePileView({
  pile,
  selected,
  justDrawnId,
  onDrop,
  onSelect,
  onActivate,
  onDragStart,
  onDragEnd,
}: WastePileViewProps) {
  const cards = pile.getCards()
  const top = cards[cards.length - 1]
  // The card just underneath the top one, if any — kept mounted (it's
  // keyed by id, so it's the very same instance that used to be the top
  // card) and peeking out slightly behind it, so drawing or dragging the
  // top card away reveals a card that was quietly there the whole time
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
            selected={false}
            style={{ top: 3, left: 2, zIndex: -1 }}
            onDrop={() => false}
            onSelect={() => {}}
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
          selected={selected?.card === top}
          revealOnMount={top.id === justDrawnId}
          style={{ top: 0, left: 0, zIndex: 0 }}
          onDrop={onDrop}
          onSelect={onSelect}
          onActivate={onActivate}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        />
      )}
    </PileSlot>
  )
}
