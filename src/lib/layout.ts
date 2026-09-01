/** Shared sizing constants so every component agrees on card geometry. */
export const CARD_WIDTH = 104
export const CARD_HEIGHT = 148
export const CARD_RADIUS = 16
export const TABLEAU_OFFSET_FACE_UP = 30
export const TABLEAU_OFFSET_FACE_DOWN = 14

/**
 * Duration and easing of the stock → waste draw: the card slides across
 * the gap while its face turns over, on one slow decelerating curve so the
 * turn begins at the stock and lands on the waste rather than snapping
 * across and then rotating. Shared by `CardView` (which runs the flip) and
 * `Board` (which knows the reveal is over once this has elapsed).
 */
export const DRAW_FLIP_MS = 800
// Ease in off the stock, ease out onto the waste, and spend the middle of
// the animation genuinely crossing the gap (rather than a front-loaded
// curve that rushes across and then finishes turning in place).
export const DRAW_FLIP_EASE = [0.5, 0, 0.2, 1] as const

/**
 * Horizontal gap between every column-like slot on the board grid.
 * `COLUMN_GAP` is the default; below the `sm` breakpoint the board is
 * scaled so far down to fit that the channels between columns are just
 * wasted width, so `COLUMN_GAP_NARROW` tightens them there (see
 * `useColumnGap`).
 */
export const COLUMN_GAP = 20
export const COLUMN_GAP_NARROW = 10

/**
 * How far the drop-zone hint outline floats outside a pile's tight bounds,
 * as a fraction of the current column gap: an adjacent pair of hints then
 * reads as evenly spaced — inset + channel + inset === gap, all three
 * equal — at whichever gap is in effect.
 */
export const DROP_ZONE_HINT_INSET_RATIO = 1 / 3
