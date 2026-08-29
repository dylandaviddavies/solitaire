import type { Card } from '../domain/Card'

export interface SelectedCard {
  card: Card
  pileId: string
}

/** Shared callback contract every pile view needs from the Board. */
export interface PileInteractionProps {
  selected: SelectedCard | null
  onDrop: (card: Card, destinationPileId: string) => boolean
  onSelect: (card: Card, pileId: string) => void
  onActivate: (card: Card) => void
  /** Announces that a real drag (past the movement threshold) has started
   * on `card`, so Board can track it and light up valid drop zones. */
  onDragStart: (card: Card, pileId: string) => void
  /** Announces that the drag has ended (dropped or cancelled). */
  onDragEnd: () => void
  /** Whether the pile identified by `pileId` would currently accept the
   * card being dragged, if any — drives the drop-zone highlight. */
  isDropTarget: (pileId: string) => boolean
}
