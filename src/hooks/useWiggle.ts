import { useCallback } from 'react'
import { animate, useMotionValue } from 'motion/react'

// A quick decaying rotation, in degrees. Starts and ends at exactly 0 so
// it can be summed onto whatever rotation an element already has without
// leaving a residual tilt.
const WIGGLE_KEYFRAMES = [0, -7, 5, -3, 1.5, 0]
const WIGGLE_TRANSITION = { duration: 0.45, ease: 'easeOut' } as const

/**
 * A one-shot playful "wiggle" for tap / drop feedback.
 *
 * Returns a live `angle` motion value (degrees) to fold into an element's
 * `rotate`, and a stable `play(delaySeconds?)` that (re)starts the wiggle
 * from the current angle — safe to call on every interaction. `delay`
 * lets a run of cards cascade rather than all shaking in unison.
 */
export function useWiggle() {
  const angle = useMotionValue(0)
  const play = useCallback(
    (delaySeconds = 0) =>
      animate(angle, WIGGLE_KEYFRAMES, { ...WIGGLE_TRANSITION, delay: delaySeconds }),
    [angle],
  )
  return { angle, play }
}
