import { createContext, useContext } from 'react'

/**
 * Card ids relocated by the most recent move (drag-drop, tap-to-move or
 * auto-play), in run order — bottom-of-run first, matching the order the
 * cards sit in their pile. Only ever reflects the latest move; empty
 * before the first one. `CardView` reads a card's position here to play a
 * staggered "landed" flourish as the run mounts into its new pile.
 */
export const RecentMovesContext = createContext<readonly string[]>([])

/**
 * `cardId`'s index within the most recent move's run, or -1 if it wasn't
 * part of it. The index doubles as the card's place in the landing
 * cascade.
 */
export function useMovedRunPosition(cardId: string): number {
  return useContext(RecentMovesContext).indexOf(cardId)
}
