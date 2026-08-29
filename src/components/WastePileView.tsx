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
}: WastePileViewProps) {
  const top = pile.top

  return (
    <PileSlot pileId={pile.id} showPlaceholder={pile.isEmpty}>
      {top && (
        <CardView
          card={top}
          pileId={pile.id}
          draggable={pile.canLift(top)}
          selected={selected?.card === top}
          revealOnMount={top.id === justDrawnId}
          style={{ top: 0, left: 0, zIndex: 0 }}
          onDrop={onDrop}
          onSelect={onSelect}
          onActivate={onActivate}
        />
      )}
    </PileSlot>
  )
}
