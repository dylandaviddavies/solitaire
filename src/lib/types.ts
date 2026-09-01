import type { Card } from '../domain/Card'

/** Shared callback contract every pile view needs from the Board. */
export interface PileInteractionProps {
  onDrop: (card: Card, destinationPileId: string) => boolean
  /** A plain click/tap on `card`: send it (and any run resting on it)
   * straight to its best legal destination. No target pile to pick — the
   * engine decides. */
  onClickMove: (card: Card) => void
  onActivate: (card: Card) => void
  /** Announces that a real drag (past the movement threshold) has started
   * on `card`, so Board can show the drop-zone hint outlines. */
  onDragStart: (card: Card, pileId: string) => void
  /** Drag released. `offset` is the card's board-space position relative
   * to its slot on a landed drop (so its glide home starts from the
   * cursor), or `null` on an invalid drop. */
  onDragEnd: (offset: { x: number; y: number } | null) => void
  /** Whether a drag is currently under way and this pile is a kind of
   * place a card could ever land — not whether the specific card being
   * dragged would legally fit here (that would just hand the player the
   * answer). Drives the neutral dashed hint outline. */
  isDropTarget: (pileId: string) => boolean
}
