import { createContext, useContext } from 'react'

/** Board-space `(dx, dy)` a card mounts offset by after changing piles —
 * the vector from its new slot back to where it visually was — eased to
 * zero so it glides in from its real previous spot. `dragged` marks a card
 * released from a drag, which lands with a firmer settle. */
export interface FlipOffset {
  dx: number
  dy: number
  dragged?: boolean
}

/** The card whose most recent move the engine refused. `nonce` bumps on
 * every rejection so a second rejection of the *same* card still replays
 * the wiggle (the id alone wouldn't change). */
export interface RejectedMove {
  cardId: string
  nonce: number
}

/**
 * Everything the UI needs to react to the most recent board mutation:
 * which cards moved (the run head sparkles as it lands), which card was
 * refused (it shakes — the "can't do that" signal), and the vector each
 * moved card should glide in from. `Board` owns all of it and swaps the
 * whole object per mutation; the selector hooks below pick out one card's
 * slice. It's one context rather than three because the pieces change
 * together and every `CardView` reads all of them anyway.
 */
export interface LastMove {
  /** Relocated card ids, bottom-of-run first; `[]` before the first move. */
  movedRunIds: readonly string[]
  rejected: RejectedMove | null
  /** cardId → entry vector, for cards that changed piles this mutation. */
  flipOffsets: ReadonlyMap<string, FlipOffset>
}

export const EMPTY_LAST_MOVE: LastMove = {
  movedRunIds: [],
  rejected: null,
  flipOffsets: new Map(),
}

export const LastMoveContext = createContext<LastMove>(EMPTY_LAST_MOVE)

/** `cardId`'s index within the moved run, or -1 — 0 marks the run head,
 * the only card that sparkles. */
export function useMovedRunPosition(cardId: string): number {
  return useContext(LastMoveContext).movedRunIds.indexOf(cardId)
}

/** The rejection nonce if `cardId` is the currently-refused card, else
 * null — a changing value is the cue to (re)play the wiggle. */
export function useRejectedNonce(cardId: string): number | null {
  const { rejected } = useContext(LastMoveContext)
  return rejected?.cardId === cardId ? rejected.nonce : null
}

/** `cardId`'s entry vector, or undefined if it didn't move this mutation. */
export function useFlipOffset(cardId: string): FlipOffset | undefined {
  return useContext(LastMoveContext).flipOffsets.get(cardId)
}
