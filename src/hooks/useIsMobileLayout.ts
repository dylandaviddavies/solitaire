import { useEffect, useState } from 'react'

// Mirrors the `sm:` breakpoint already used for every other mobile/desktop
// split in this app (Toolbar sizing, footer text, etc.), so the draw pile's
// placement switches at the same width everything else does.
const MOBILE_BREAKPOINT_QUERY = '(max-width: 639px)'

/**
 * True below the `sm:` breakpoint. Backed by `matchMedia` rather than a
 * resize listener so it only fires when the boolean actually flips, and
 * updates live across a browser resize or a tablet rotation.
 */
export function useIsMobileLayout(): boolean {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia(MOBILE_BREAKPOINT_QUERY).matches,
  )

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_BREAKPOINT_QUERY)
    const listener = (event: MediaQueryListEvent) => setIsMobile(event.matches)
    setIsMobile(mql.matches)
    mql.addEventListener('change', listener)
    return () => mql.removeEventListener('change', listener)
  }, [])

  return isMobile
}
