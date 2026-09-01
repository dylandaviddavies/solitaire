import { useCallback } from 'react'
import { animate, useMotionValue } from 'motion/react'
import { WIGGLE_KEYFRAMES, WIGGLE_TRANSITION } from '../lib/animation'

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
