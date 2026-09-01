import { COLUMN_GAP, COLUMN_GAP_NARROW } from '../lib/layout'
import { useIsNarrowViewport } from './useIsNarrowViewport'

/**
 * The horizontal gap between column-like slots on the board grid. Below
 * the `sm` breakpoint the whole board is scaled well down to fit, so a
 * full-width gap is just wasted space the cards could be using — tighten
 * it there.
 */
export function useColumnGap(): number {
  return useIsNarrowViewport() ? COLUMN_GAP_NARROW : COLUMN_GAP
}
