import { useSyncExternalStore } from 'react'

// A landscape phone (and a short desktop window) has far less height than
// the board wants, so it scales the whole board down to fit and wastes the
// width. Below this height we switch to a shorter board — the tableau
// columns fan their cards tighter (see `TableauColumnView`) instead of
// reserving a tall vertical band that's mostly empty. Portrait phones and
// normal desktop heights sit well above it and keep the roomy fan.
const SHORT_QUERY = '(max-height: 560px)'

const subscribe = (onChange: () => void) => {
  const mql = window.matchMedia(SHORT_QUERY)
  mql.addEventListener('change', onChange)
  return () => mql.removeEventListener('change', onChange)
}

/** True when the viewport is too short for the board's roomy layout —
 * live-updating across a resize or device rotation. */
export function useShortViewport(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(SHORT_QUERY).matches,
    () => false,
  )
}
