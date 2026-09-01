import { RANKS, Suit, type Rank } from './Card'
import type { GameSnapshot, SerializedCard } from './GameEngine'

/**
 * Board fixtures shared by the engine's own unit tests and the Playwright
 * end-to-end test (which seeds one of these into `localStorage` so the app
 * resumes it on load). Nothing here is imported by production code.
 */

export const ALL_SUITS: Suit[] = [Suit.Hearts, Suit.Clubs, Suit.Diamonds, Suit.Spades]

export const card = (rank: Rank, suit: Suit, faceUp = false): SerializedCard => ({
  rank,
  suit,
  faceUp,
})

/** Marks the last card of a list face-up, the rest face-down. */
export const asColumn = (cards: SerializedCard[]): SerializedCard[] =>
  cards.map((c, i) => ({ ...c, faceUp: i === cards.length - 1 }))

export function emptySnapshot(): GameSnapshot {
  return {
    version: 2,
    seed: 1,
    stock: [],
    waste: [],
    foundations: [[], [], [], []],
    tableau: [[], [], [], [], [], [], []],
    dealQueue: [],
    movesMade: 0,
    startedAt: Date.now(),
  }
}

/**
 * A rigged but fully legal starting position a greedy player can win:
 *
 * - Tableau: seven columns, column `i` holds rank `i + 1` (Ace…Seven) of
 *   every suit, only the top card face-up. Playing each top to a
 *   foundation reveals the next, cascading all 28 cards up and leaving the
 *   foundations on the Seven.
 * - Stock: the remaining 24 cards (Eight…King of every suit), ordered so
 *   drawing them one at a time feeds the foundations in order.
 */
export function winnableDealSnapshot(): GameSnapshot {
  const snapshot = emptySnapshot()

  snapshot.tableau = Array.from({ length: 7 }, (_, i) =>
    asColumn(ALL_SUITS.map((suit) => card(RANKS[i], suit))),
  )

  const drawOrder: SerializedCard[] = []
  for (const rank of RANKS.slice(7)) {
    for (const suit of ALL_SUITS) drawOrder.push(card(rank, suit))
  }
  // `stock` is stored bottom-to-top and drawn from the top, so reverse the
  // intended draw order.
  snapshot.stock = drawOrder.reverse()

  return snapshot
}

/**
 * All 52 cards face-up in four single-suit columns, Ace on top, with an
 * empty stock and waste — so the engine immediately reports
 * `canAutoComplete()` and a single "Auto Finish" click runs the whole
 * game home. Used by the e2e test to drive a full win through the real UI.
 */
export function autoCompletableSnapshot(): GameSnapshot {
  const snapshot = emptySnapshot()
  snapshot.tableau = ALL_SUITS.map((suit) =>
    [...RANKS].reverse().map((rank) => card(rank, suit, true)),
  )
  return snapshot
}
