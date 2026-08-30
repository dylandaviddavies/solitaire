/** Shared sizing constants so every component agrees on card geometry. */
export const CARD_WIDTH = 104
export const CARD_HEIGHT = 148
export const CARD_RADIUS = 16
export const TABLEAU_OFFSET_FACE_UP = 30
export const TABLEAU_OFFSET_FACE_DOWN = 14

/** Horizontal gap between every column-like slot on the board grid. */
export const COLUMN_GAP = 20

/**
 * How far the drop-zone hint outline floats outside a pile's tight bounds.
 * One third of the column gap, so an adjacent pair of hints reads as
 * evenly spaced: inset + channel + inset === COLUMN_GAP, all three equal.
 */
export const DROP_ZONE_HINT_INSET = COLUMN_GAP / 3
