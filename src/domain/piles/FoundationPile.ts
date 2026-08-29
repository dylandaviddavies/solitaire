import type { Card } from '../Card'
import type { Suit } from '../Card'
import { Pile, PileKind } from './Pile'

/**
 * A foundation pile is suit-locked once its first card lands, builds
 * Ace-to-King, and only ever gives up its top card.
 */
export class FoundationPile extends Pile {
  readonly suit: Suit

  constructor(id: string, suit: Suit) {
    super(id, PileKind.Foundation)
    this.suit = suit
  }

  canAccept(moving: Card): boolean {
    if (moving.suit !== this.suit) return false
    if (this.isEmpty) return moving.rank === 'A'
    return moving.isOneMoreThan(this.top!)
  }

  get isComplete(): boolean {
    return this.length === 13
  }
}
