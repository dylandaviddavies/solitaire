import { useCallback } from 'react'
import { animate, useMotionValue } from 'motion/react'
import { WIGGLE_KEYFRAMES, WIGGLE_TRANSITION } from '../lib/animation'

/**
 * A one-shot playful "wiggle" for refused-move feedback.
 *
 * Returns a live `angle` motion value (degrees) to fold into an element's
 * `rotate`, and a stable `play(delaySeconds?)` that (re)starts the wiggle
 * from the current angle. When `enabled` is false (reduced motion) `play`
 * is a no-op and `angle` stays at 0.
 */
export function useWiggle(enabled = true) {
  const angle = useMotionValue(0)
  const play = useCallback(
    (delaySeconds = 0) => {
      if (!enabled) return
      animate(angle, WIGGLE_KEYFRAMES, { ...WIGGLE_TRANSITION, delay: delaySeconds })
    },
    [angle, enabled],
  )
  return { angle, play }
}
