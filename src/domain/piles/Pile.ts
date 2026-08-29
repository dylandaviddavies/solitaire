import type { Card } from '../Card'

export const PileKind = {
  Stock: 'stock',
  Waste: 'waste',
  Foundation: 'foundation',
  Tableau: 'tableau',
} as const
export type PileKind = (typeof PileKind)[keyof typeof PileKind]

/**
 * Abstract base for every pile of cards on the board.
 *
 * This is the crux of the Open/Closed design: `GameEngine` only ever talks
 * to piles through this contract (and the narrower ones below). Adding a
 * new kind of pile — say, a "cell" for a FreeCell variant — never requires
 * changing GameEngine, only adding a new subclass.
 */
export abstract class Pile {
  readonly id: string
  readonly kind: PileKind
  protected cards: Card[] = []

  protected constructor(id: string, kind: PileKind) {
    this.id = id
    this.kind = kind
  }

  get length(): number {
    return this.cards.length
  }

  get isEmpty(): boolean {
    return this.cards.length === 0
  }

  get top(): Card | undefined {
    return this.cards[this.cards.length - 1]
  }

  /** Read-only snapshot of the cards, bottom to top. */
  getCards(): readonly Card[] {
    return this.cards
  }

  /**
   * Whether `moving` (the bottom card of a dragged stack) may legally be
   * dropped on this pile right now. Subclasses encode their own rule.
   */
  abstract canAccept(moving: Card): boolean

  /**
   * Whether a stack of cards starting at `card` (inclusive, i.e. `card`
   * and everything above it) may be picked up from this pile at all.
   * Most piles only allow picking up a single top card; the tableau
   * additionally allows a valid ordered run.
   */
  canLift(card: Card): boolean {
    return card === this.top
  }

  /** Push a single card without any rule checking (engine already checked). */
  push(card: Card): void {
    this.cards.push(card)
  }

  pushMany(cards: Card[]): void {
    this.cards.push(...cards)
  }

  /** Remove and return the top card. */
  pop(): Card | undefined {
    return this.cards.pop()
  }

  /** Remove and return `card` and every card above it. */
  removeFrom(card: Card): Card[] {
    const index = this.cards.indexOf(card)
    if (index === -1) return []
    return this.cards.splice(index)
  }

  /** Reveals the new top card if it's face down (classic tableau behaviour). */
  flipTopUp(): Card | undefined {
    const top = this.top
    if (top && !top.faceUp) {
      top.flipUp()
      return top
    }
    return undefined
  }

  reset(cards: Card[] = []): void {
    this.cards = cards
  }
}
