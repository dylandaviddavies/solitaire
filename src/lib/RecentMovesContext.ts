import { createContext, useContext } from 'react'

/**
 * Card ids relocated by the most recent move (drag-drop, tap-to-move or
 * auto-play), in run order — bottom-of-run first, matching the order the
 * cards sit in their pile. Only ever reflects the latest move; empty
 * before the first one. `CardView` reads this so the run's head sparkles
 * as it mounts into its new pile — the "it worked" counterpart to the
 * refused-move wiggle (see `RejectedMoveContext`).
 */
export const RecentMovesContext = createContext<readonly string[]>([])

/** `cardId`'s index within the most recent move's run, or -1 if it wasn't
 * part of it — 0 marks the run head, the only card that sparkles. */
export function useMovedRunPosition(cardId: string): number {
  return useContext(RecentMovesContext).indexOf(cardId)
}
