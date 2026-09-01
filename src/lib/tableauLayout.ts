import {
  CARD_HEIGHT,
  TABLEAU_OFFSET_FACE_DOWN,
  TABLEAU_OFFSET_FACE_UP,
  TABLEAU_OFFSET_FACE_UP_MIN,
} from './layout'

/**
 * The vertical step between each pair of stacked tableau cards, after any
 * squeeze needed to keep the column inside `maxHeight`: the face-up step
 * (its overlap is redundant) tightens first, down to a floor, and the
 * face-down step only if that still isn't enough. `*Below` counts the
 * cards of each kind that have another card stacked on them — only those
 * carry a step.
 */
export function tableauFanSteps(faceDownBelow: number, faceUpBelow: number, maxHeight: number) {
  let faceDown = TABLEAU_OFFSET_FACE_DOWN
  let faceUp = TABLEAU_OFFSET_FACE_UP
  const room = maxHeight - CARD_HEIGHT
  if (faceDownBelow * faceDown + faceUpBelow * faceUp <= room) return { faceDown, faceUp }

  faceUp =
    faceUpBelow > 0
      ? Math.max(TABLEAU_OFFSET_FACE_UP_MIN, (room - faceDownBelow * faceDown) / faceUpBelow)
      : faceUp
  if (faceDownBelow > 0 && faceDownBelow * faceDown + faceUpBelow * faceUp > room) {
    faceDown = Math.max(2, (room - faceUpBelow * faceUp) / faceDownBelow)
  }
  return { faceDown, faceUp }
}

/**
 * Cumulative y-offset of every card in a tableau column, given each card's
 * face-up flag (bottom of stack first) and the height the column must fit.
 * Shared by `TableauColumnView` (which renders at these offsets) and
 * `Board` (which needs a card's exact resting spot to animate a move from
 * the right place).
 */
export function tableauOffsets(faceUpFlags: readonly boolean[], maxHeight: number): number[] {
  const below = faceUpFlags.slice(0, -1)
  const { faceDown, faceUp } = tableauFanSteps(
    below.filter((f) => !f).length,
    below.filter((f) => f).length,
    maxHeight,
  )
  const offsets: number[] = []
  let y = 0
  for (const faceUpFlag of faceUpFlags) {
    offsets.push(y)
    y += faceUpFlag ? faceUp : faceDown
  }
  return offsets
}
