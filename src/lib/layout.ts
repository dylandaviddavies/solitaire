/** Shared sizing constants so every component agrees on card geometry. */
export const CARD_WIDTH = 104
export const CARD_HEIGHT = 148
export const CARD_RADIUS = 16
// The vertical step between stacked tableau cards at their roomiest. A
// column squeezes these tighter (face-up first, down to
// `TABLEAU_OFFSET_FACE_UP_MIN`) when its run would otherwise outgrow the
// height it's been given — see `TableauColumnView`.
export const TABLEAU_OFFSET_FACE_UP = 30
export const TABLEAU_OFFSET_FACE_DOWN = 14
/** Floor for the squeezed face-up step — still enough to read each card's
 * corner rank + suit. */
export const TABLEAU_OFFSET_FACE_UP_MIN = 9

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
