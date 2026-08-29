import { createContext, useContext } from 'react'

/**
 * The current uniform scale factor `ResponsiveStage` is applying to the
 * board (1 on desktop, smaller on a narrow/mobile viewport). A translate
 * value set on an element *inside* that scaled subtree gets multiplied by
 * this same factor once rendered on screen, so any code (like the card
 * drag) that computes a target position from real screen-pixel
 * coordinates (`event.clientX`/`getBoundingClientRect`) must divide by
 * this scale before feeding it back in as a CSS transform, or the card
 * only travels `scale` of the intended distance.
 */
export const StageScaleContext = createContext(1)

export function useStageScale(): number {
  return useContext(StageScaleContext)
}
