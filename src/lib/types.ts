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
   * on `card`, so Board can show the drop-zone hint outlines. */
  onDragStart: (card: Card, pileId: string) => void
  /** Announces that the drag has ended (dropped or cancelled). */
  onDragEnd: () => void
  /** Whether a drag is currently under way and this pile is a kind of
   * place a card could ever land — not whether the specific card being
   * dragged would legally fit here (that would just hand the player the
   * answer). Drives the neutral dashed hint outline. */
  isDropTarget: (pileId: string) => boolean
}
