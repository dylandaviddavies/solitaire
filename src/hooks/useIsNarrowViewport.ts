import { useSyncExternalStore } from 'react'

// Tailwind's `sm` breakpoint. Below it the board is scaled well down to
// fit, so the column gap tightens and the toolbar drops to its dense
// sizing — a phone-width screen can't spare the room either way.
const NARROW_QUERY = '(max-width: 639px)'

const subscribe = (onChange: () => void) => {
  const mql = window.matchMedia(NARROW_QUERY)
  mql.addEventListener('change', onChange)
  return () => mql.removeEventListener('change', onChange)
}

/** True on a phone-width viewport, live-updating across a resize or
 * rotation. */
export function useIsNarrowViewport(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(NARROW_QUERY).matches,
    () => false,
  )
}
