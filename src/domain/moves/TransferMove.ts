import type { Card } from '../Card'
import type { Pile } from '../piles/Pile'
import type { Move } from './Move'

/**
 * Moves a run of one or more cards from one pile to another, transparently
 * handling the classic "reveal the new top card of the source" rule and
 * undoing it symmetrically.
 */
export class TransferMove implements Move {
  readonly kind = 'transfer'
  private flippedReveal = false
  private readonly source: Pile
  private readonly destination: Pile
  private readonly cards: Card[]

  constructor(source: Pile, destination: Pile, cards: Card[]) {
    this.source = source
    this.destination = destination
    this.cards = cards
  }

  /** Ids of the cards this move relocates, for UI landing feedback. */
  get movedCardIds(): string[] {
    return this.cards.map((card) => card.id)
  }

  execute(): void {
    const removed = this.source.removeFrom(this.cards[0])
    this.destination.pushMany(removed)
    const revealed = this.source.flipTopUp()
    this.flippedReveal = Boolean(revealed)
  }

  undo(): void {
    if (this.flippedReveal) {
      this.source.top?.flipDown()
    }
    const removed = this.destination.removeFrom(this.cards[0])
    this.source.pushMany(removed)
  }
}
