/**
 * The app's animation vocabulary — every spring, curve and duration the
 * card interactions are tuned with, in one place so the "feel" stays
 * consistent and is adjustable without hunting through components. Pure
 * geometry (sizes, gaps, offsets) lives in `layout.ts`; genuinely one-off
 * values stay inline at their single call site.
 */

// --- The stock → waste draw -----------------------------------------------
// The card slides across the gap while its face turns over, on one slow
// decelerating curve so the turn begins at the stock and lands on the
// waste rather than snapping across and then rotating. `Board` also needs
// the duration to know when the reveal is over.
export const DRAW_FLIP_MS = 800
export const DRAW_FLIP = {
  duration: DRAW_FLIP_MS / 1000,
  // Ease in off the stock, ease out onto the waste, and spend the middle
  // genuinely crossing the gap.
  ease: [0.5, 0, 0.2, 1],
} as const

// --- Cards settling into place ------------------------------------------
/** A card released from a drag drops the short distance from the cursor
 * into its slot — quick, and a little under-damped so it clicks in with a
 * small bounce. */
export const DROP_SETTLE = { type: 'spring', stiffness: 340, damping: 25, mass: 0.9 } as const
/** A tap/auto-move sends a card the full width of the board, so it wants a
 * travelling ease — soft and near-critically damped, arriving without
 * wobbling on the pile. */
export const ARRIVE_SPRING = { type: 'spring', stiffness: 150, damping: 26, mass: 1.1 } as const
/** Returns a card to its rest slot after an invalid drop — a bit of
 * spring is welcome here. */
export const SNAP_BACK = { type: 'spring', stiffness: 480, damping: 34, mass: 0.6 } as const
/** Runs once as a drag begins: a short, finite ease that glides the card
 * from wherever it was grabbed onto the cursor and ends at exactly 0, so
 * tracking is pixel-tight from then on. */
export const LOCK_ON = { type: 'tween', duration: 0.16, ease: 'easeOut' } as const

// --- The lift under the pointer ---------------------------------------------
/** Scale + shadow of a pressed/carried card, and the spring the outer
 * element settles that scale with. */
export const LIFT_SCALE = 1.07
export const LIFT_TRANSLATE_Y = -14
export const PRESS_SPRING = { type: 'spring', stiffness: 420, damping: 34, mass: 0.9 } as const
/** Squash-and-stretch: on grab the card pinches taller/narrower for a
 * beat, on a drop-landing it splats wider/shorter, then a springy recover
 * to rest. The classic bit of "juice". */
export const SQUASH_X = 0.94
export const SQUASH_Y = 1.06
export const SQUASH_SPRING = { type: 'spring', stiffness: 520, damping: 17, mass: 0.7 } as const
export const REST_SHADOW = '0 3px 0 rgba(15,15,20,0.35), 0 8px 14px rgba(15,15,20,0.28)'
export const LIFT_SHADOW = '0 10px 0 rgba(15,15,20,0.3), 0 22px 30px rgba(15,15,20,0.38)'

// --- The face turn-over / same-pile shifts -------------------------------
/** Default spring for the inner card element — the face-up roll and the
 * lift's y/shadow. Distinct from the outer `rotateY` timing (`DRAW_FLIP`),
 * which the draw stretches to match its slide. */
export const FLIP_ROLL_SPRING = { type: 'spring', stiffness: 380, damping: 26 } as const

// --- The drag sway --------------------------------------------------------
/** Max tilt (degrees) of a carried card, and the slow spring that lags the
 * tilt behind the cursor for an organic "swaying" feel. */
export const SWAY_MAX_DEG = 16
export const SWAY_SPRING = { stiffness: 90, damping: 14, mass: 1.1 } as const

// --- Tap / drop rejection wiggle -----------------------------------------
/** A quick decaying rotation (degrees) — a nudge, not a shake. Starts and
 * ends at exactly 0 so it sums onto an element's existing rotation with no
 * residual tilt. */
export const WIGGLE_KEYFRAMES = [0, -3.5, 2.5, -1.5, 0.5, 0]
export const WIGGLE_TRANSITION = { duration: 0.45, ease: 'easeOut' } as const

// --- Drag activation ----------------------------------------------------
/** A drag only begins once the pointer has been held for `DRAG_ACTIVATE_MS`
 * *and* travelled past `DRAG_START_THRESHOLD_PX` — the hold keeps a click
 * that drifts a few pixels from being read as a drag. */
export const DRAG_ACTIVATE_MS = 140
export const DRAG_START_THRESHOLD_PX = 6
