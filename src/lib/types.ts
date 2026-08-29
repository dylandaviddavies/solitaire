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
}
