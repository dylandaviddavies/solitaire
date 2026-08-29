import type { WastePile } from '../domain/piles/WastePile'
import type { PileInteractionProps } from '../lib/types'
import { CardView } from './CardView'
import { PileSlot } from './PileSlot'

interface WastePileViewProps extends PileInteractionProps {
  pile: WastePile
}

export function WastePileView({ pile, selected, onDrop, onSelect, onActivate }: WastePileViewProps) {
  const top = pile.top

  return (
    <PileSlot pileId={pile.id} showPlaceholder={pile.isEmpty}>
      {top && (
        <CardView
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
