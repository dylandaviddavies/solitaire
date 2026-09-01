import { createContext, useContext } from 'react'

export interface RejectedMove {
  cardId: string
  /** Bumps on every rejection so a second rejection of the *same* card
   * still replays the wiggle (the id alone wouldn't change). */
  nonce: number
}

/**
 * The card whose most recent move the engine refused — a drop onto a pile
 * that can't take it, a tap with nowhere legal to go, a double-tap that
 * doesn't fit a foundation. `CardView` reads this to shake that one card:
 * the wiggle is the "can't do that" signal, so it fires here and nowhere
 * else (a successful move sparkles instead — see `RecentMovesContext`).
 */
export const RejectedMoveContext = createContext<RejectedMove | null>(null)

/** The rejection nonce if `cardId` is the one currently rejected, else
 * null — a changing value is the cue to (re)play the wiggle. */
export function useRejectedNonce(cardId: string): number | null {
  const rejected = useContext(RejectedMoveContext)
  return rejected?.cardId === cardId ? rejected.nonce : null
}
