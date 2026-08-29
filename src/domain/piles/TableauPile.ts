import type { Card } from '../Card'
import { Pile, PileKind } from './Pile'

/**
 * A tableau column. Accepts a descending, alternating-color card (or a
 * King on an empty column) and allows lifting any face-up run that is
 * itself a valid descending/alternating sequence.
 */
export class TableauPile extends Pile {
  constructor(id: string) {
    super(id, PileKind.Tableau)
  }

  canAccept(moving: Card): boolean {
    if (this.isEmpty) {
      return moving.rank === 'K'
    }
    const top = this.top!
    return top.faceUp && top.color !== moving.color && top.isOneMoreThan(moving)
  }

  canLift(card: Card): boolean {
    if (!card.faceUp) return false
    const index = this.cards.indexOf(card)
    if (index === -1) return false
    const run = this.cards.slice(index)
    return this.isValidRun(run)
  }

  /** The face-up run starting at `card`, used to render/drag a stack. */
  runFrom(card: Card): Card[] {
    const index = this.cards.indexOf(card)
    if (index === -1) return []
    return this.cards.slice(index)
  }

  private isValidRun(run: Card[]): boolean {
    for (let i = 0; i < run.length - 1; i++) {
      const current = run[i]
      const next = run[i + 1]
      if (!current.faceUp) return false
      if (current.color === next.color) return false
      if (!current.isOneMoreThan(next)) return false
    }
    return true
  }
}
