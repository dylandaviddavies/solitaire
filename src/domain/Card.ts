/**
 * Core card model. Immutable value semantics are avoided in favor of
 * controlled mutation through explicit methods (flip), keeping a single
 * source of truth per physical card for the lifetime of a game.
 */

export const Suit = {
  Hearts: 'hearts',
  Diamonds: 'diamonds',
  Clubs: 'clubs',
  Spades: 'spades',
} as const
export type Suit = (typeof Suit)[keyof typeof Suit]

export const Color = {
  Red: 'red',
  Black: 'black',
} as const
export type Color = (typeof Color)[keyof typeof Color]

export const RANKS = [
  'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K',
] as const

export type Rank = (typeof RANKS)[number]

const SUIT_COLOR: Record<Suit, Color> = {
  [Suit.Hearts]: Color.Red,
  [Suit.Diamonds]: Color.Red,
  [Suit.Clubs]: Color.Black,
  [Suit.Spades]: Color.Black,
}

const SUIT_SYMBOL: Record<Suit, string> = {
  [Suit.Hearts]: '♥',
  [Suit.Diamonds]: '♦',
  [Suit.Clubs]: '♣',
  [Suit.Spades]: '♠',
}

let uid = 0

/**
 * A single playing card. Knows only about itself: its identity, rank,
 * suit, and face-up/down state. Contains no knowledge of piles, rules,
 * or the rest of the game (Single Responsibility Principle).
 */
export class Card {
  readonly id: string
  readonly suit: Suit
  readonly rank: Rank
  readonly rankIndex: number // 0 = Ace ... 12 = King
  private _faceUp: boolean

  constructor(suit: Suit, rank: Rank, faceUp = false) {
    this.id = `${rank}-${suit}-${uid++}`
    this.suit = suit
    this.rank = rank
    this.rankIndex = RANKS.indexOf(rank)
    this._faceUp = faceUp
  }

  get faceUp(): boolean {
    return this._faceUp
  }

  get color(): Color {
    return SUIT_COLOR[this.suit]
  }

  get symbol(): string {
    return SUIT_SYMBOL[this.suit]
  }

  /** 1-13, Ace low, King high. */
  get value(): number {
    return this.rankIndex + 1
  }

  isRed(): boolean {
    return this.color === Color.Red
  }

  isBlack(): boolean {
    return this.color === Color.Black
  }

  flipUp(): void {
    this._faceUp = true
  }

  flipDown(): void {
    this._faceUp = false
  }

  setFaceUp(value: boolean): void {
    this._faceUp = value
  }

  /** True if `other` is one rank below this card (used by tableau rules). */
  isOneMoreThan(other: Card): boolean {
    return this.rankIndex === other.rankIndex + 1
  }

  isOneLessThan(other: Card): boolean {
    return this.rankIndex === other.rankIndex - 1
  }

  clone(): Card {
    return new Card(this.suit, this.rank, this._faceUp)
  }
}
