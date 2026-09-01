import { useSyncExternalStore } from 'react'
import { COLUMN_GAP, COLUMN_GAP_NARROW } from '../lib/layout'

// Below Tailwind's `sm` breakpoint the whole board is scaled well down to
// fit, so a full-width gap between columns is just wasted space the cards
// could be using. Tightening it there lets every column — and the cards
// in it — render a little larger. Matches the `sm:` split used elsewhere
// in the app (toolbar sizing, page padding).
const NARROW_QUERY = '(max-width: 639px)'

const subscribe = (onChange: () => void) => {
  const mql = window.matchMedia(NARROW_QUERY)
  mql.addEventListener('change', onChange)
  return () => mql.removeEventListener('change', onChange)
}

/** The horizontal gap to use between column-like slots on the board grid,
 * live-updating across a viewport resize or device rotation. */
export function useColumnGap(): number {
  const isNarrow = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(NARROW_QUERY).matches,
    () => false,
  )
  return isNarrow ? COLUMN_GAP_NARROW : COLUMN_GAP
}
