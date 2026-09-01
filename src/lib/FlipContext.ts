import { createContext, useContext } from 'react'

/** Board-space `(dx, dy)` for each card that just changed piles: the
 * vector from where it now rests back to where it visually was a moment
 * ago. A freshly-mounted `CardView` starts offset by its entry and eases
 * it to zero, so the card glides in from its real previous spot instead of
 * blinking straight to the new pile. Empty between moves. */
export type FlipOffsets = ReadonlyMap<string, { dx: number; dy: number }>

export const FlipOffsetsContext = createContext<FlipOffsets>(new Map())

/** This card's entry vector, or undefined if it didn't move in the last
 * mutation. */
export function useFlipOffset(cardId: string): { dx: number; dy: number } | undefined {
  return useContext(FlipOffsetsContext).get(cardId)
}
