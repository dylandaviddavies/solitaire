import { createContext, useContext } from 'react'

/**
 * Card ids that were relocated to a new pile by the most recent move
 * (drag-drop, tap-to-move or auto-play). Only ever reflects the latest
 * move; empty before the first one. `CardView` reads it to play a
 * one-shot "landed" flourish as those cards mount into their new pile.
 */
export const RecentMovesContext = createContext<ReadonlySet<string>>(new Set())

/** Whether `cardId` was part of the most recent move. */
export function useRecentlyMoved(cardId: string): boolean {
  return useContext(RecentMovesContext).has(cardId)
}
