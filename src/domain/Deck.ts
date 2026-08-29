import { Card, RANKS, Suit } from './Card'

/**
 * Responsible only for producing and shuffling a standard 52-card deck.
 * Nothing downstream needs to know how cards are constructed or shuffled.
 */
export class Deck {
  private cards: Card[]

  private constructor(cards: Card[]) {
    this.cards = cards
  }

  static freshShuffled(rng: () => number = Math.random): Deck {
    const deck = Deck.ordered()
    deck.shuffle(rng)
    return deck
  }

  static ordered(): Deck {
    const cards: Card[] = []
    for (const suit of Object.values(Suit)) {
      for (const rank of RANKS) {
        cards.push(new Card(suit, rank, false))
      }
    }
    return new Deck(cards)
  }

  /** Fisher-Yates shuffle, in place. */
  shuffle(rng: () => number = Math.random): void {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1))
      ;[this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]]
    }
  }

  draw(count: number): Card[] {
    return this.cards.splice(0, count)
  }

  get remaining(): number {
    return this.cards.length
  }
}
