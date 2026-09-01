import { animate, motion, useMotionValue, useSpring, useTransform } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import type { Card } from '../domain/Card'
import { useCardBackPreference } from '../hooks/useCardBackPreference'
import { useWiggle } from '../hooks/useWiggle'
import { useDropRegistry } from '../lib/DropRegistryContext'
import { CARD_HEIGHT, CARD_WIDTH } from '../lib/layout'
import { useMovedRunPosition } from '../lib/RecentMovesContext'
import { useStageScale } from '../lib/StageScaleContext'
import { CardBack } from './CardBack'
import { CardFace } from './CardFace'
import { SparkleBurst } from './SparkleBurst'

/** A motion value driving a single number — named via the hook's own
 * return type rather than importing framer-motion's internal `MotionValue`
 * class (which `motion/react` doesn't re-export by that name). */
type NumberMotionValue = ReturnType<typeof useMotionValue<number>>

/** The live position/rotation of a card actively being dragged, shared
 * with the other cards in its run so they can visually follow along. */
export interface DragTransform {
  x: NumberMotionValue
  y: NumberMotionValue
  rotate: NumberMotionValue
}

interface CardViewProps {
  card: Card
  pileId: string
  draggable: boolean
  /** True for the one card that just landed here face-up from a fresh
   * mount (e.g. a stock draw) — it should visibly flip in rather than
   * just appear, since normal same-pile re-renders already flip smoothly
   * on their own. */
  revealOnMount?: boolean
  style?: React.CSSProperties
  onDrop: (card: Card, destinationPileId: string) => boolean
  /** A plain click/tap (no drag): send this card to its best legal
   * destination. */
  onClickMove: (card: Card) => void
  onActivate: (card: Card) => void
  /** Optional: omitted for cards that can never be dragged (e.g. the
   * stock's face-down top, or a "peek" card rendered just to fill in the
   * pile visually — see WastePileView/FoundationSlotView/StockPileView). */
  onDragStart?: (card: Card, pileId: string) => void
  onDragEnd?: () => void
  /** Fires the instant this card is pressed (before any movement),
   * handing up its live position/rotation motion values so a parent
   * (e.g. TableauColumnView) can hook the rest of the run onto them right
   * away — the whole run then lifts and moves as one from first touch,
   * with no lag before the lower cards catch up. `onPressEnd` fires on
   * release/cancel whether or not a drag actually happened. */
  onPressStart?: (transform: DragTransform) => void
  onPressEnd?: () => void
  /** When set, this card is part of a run whose base is being dragged
   * elsewhere: it mirrors that card's position/rotation exactly instead
   * of driving its own, and skips its own layout/press styling. */
  followTransform?: DragTransform
  /** Set by a parent to wiggle this card as part of a run whose head was
   * tapped. `nonce` changes on every tap (so a repeat tap replays it);
   * `order` is the card's place in the run, for the cascade delay. */
  groupWiggle?: { nonce: number; order: number }
  /** Whether a plain press should give the usual tactile feedback — the
   * card lifts under the pointer and the click wiggles it. Default true.
   * Set false where the click is really a button (the stock: clicking it
   * draws, and the card immediately flips away to the waste, so lifting
   * it first just reads as a snap-back). */
  liftOnPress?: boolean
  /** Whether this card participates in the shared-layout (`layoutId`)
   * system that FLIP-animates a card sliding from one pile to another.
   * Default true. False for the stock, whose cards never travel — they
   * sit face-down until consumed — so a draw should read as the waste
   * card flipping in place, not sliding over from the deck. */
  sharedLayout?: boolean
}

// Seconds of delay added per card down a run, so a group wiggle ripples
// through the fan instead of every card shaking in lockstep.
const WIGGLE_STAGGER_S = 0.05

// Viewer distance for the face-up flip. Without a perspective the rotateY
// is just a flat horizontal squash that reads as a spin. Kept fairly
// short relative to the card so the turn has obvious depth — the leading
// half bulges toward the viewer as the card comes over.
const FLIP_PERSPECTIVE_PX = 380

const REST_SHADOW =
  '0 3px 0 rgba(15,15,20,0.35), 0 8px 14px rgba(15,15,20,0.28)'
const LIFT_SHADOW =
  '0 10px 0 rgba(15,15,20,0.3), 0 22px 30px rgba(15,15,20,0.38)'

const SWAY_MAX_DEG = 16
const DRAG_START_THRESHOLD_PX = 4
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

// Settle transitions for the `catchUp` offset (see below). `LOCK_ON` runs
// once as a drag begins: a short, finite ease that glides the card from
// wherever it was grabbed onto the cursor and then — crucially — ends at
// exactly 0, so from that point on the card is pixel-locked to the
// pointer with no residual trailing. `SNAP_BACK` returns the card to its
// rest slot after an invalid drop, where a bit of spring is welcome.
const LOCK_ON = { type: 'tween' as const, duration: 0.16, ease: 'easeOut' as const }
const SNAP_BACK = { type: 'spring' as const, stiffness: 480, damping: 34, mass: 0.6 }
type SettleTransition = typeof LOCK_ON | typeof SNAP_BACK

// The card is always "held" by its top-center, like pinching the top edge
// between two fingers — not by whichever pixel you happened to click.
// Wherever the pointer goes, that exact point follows it, and the sway
// pivots from the same spot, so every drag behaves identically (Balatro-
// style) instead of varying with where on the card you grabbed it.
const ANCHOR = { x: 0.5, y: 0 }

export function CardView({
  card,
  pileId,
  draggable,
  revealOnMount,
  style,
  onDrop,
  onClickMove,
  onActivate,
  onDragStart,
  onDragEnd,
  onPressStart,
  onPressEnd,
  followTransform,
  groupWiggle,
  liftOnPress = true,
  sharedLayout = true,
}: CardViewProps) {
  const registry = useDropRegistry()
  const cardBack = useCardBackPreference()
  // The board is uniformly scaled down to fit narrow/mobile viewports
  // (see ResponsiveStage) — a translate value set inside that scaled
  // subtree gets multiplied by this same factor on screen, so real
  // screen-pixel pointer deltas must be divided by it before being fed
  // back in as x/y, or the card only travels `stageScale` of the
  // intended distance.
  const stageScale = useStageScale()
  const wasDragged = useRef(false)
  const isDraggingRef = useRef(false)
  // The card's on-screen rest position (and actual rendered width — the
  // board can be scaled down to fit narrow/mobile viewports, so this must
  // be measured rather than assumed from the logical CARD_WIDTH constant)
  // at the moment it was grabbed, so every subsequent pointer position can
  // be converted into a translate offset from that rest position.
  const restRect = useRef<{ left: number; top: number; width: number } | null>(null)
  const startPoint = useRef({ x: 0, y: 0 })
  const lastClientX = useRef(0)
  // Lifts the instant the card is grabbed (pointer down), not just once an
  // actual drag is recognized — a real card lifts as soon as you pinch it.
  const [isPressed, setIsPressed] = useState(false)

  // `rawX`/`rawY` are the card's exact target position — set directly
  // (never sprung) on every pointer move, so once a drag is under way the
  // card is glued to the cursor with zero lag, however fast it moves.
  // `catchUpX`/`catchUpY` are a short-lived "how far behind are we"
  // offset, added on top: non-zero only for the brief moment right after
  // a drag starts (the card's pinch-point may be some distance from
  // wherever it was actually grabbed) or ends without a valid drop
  // (snapping back to rest), and animated down to 0 by `retarget` below.
  // Splitting these means the settle-in/settle-back transitions can still
  // ease smoothly without adding any per-frame lag to live tracking.
  const rawX = useMotionValue(0)
  const rawY = useMotionValue(0)
  const catchUpX = useMotionValue(0)
  const catchUpY = useMotionValue(0)
  const x = useTransform([rawX, catchUpX], (latest) => (latest[0] as number) + (latest[1] as number))
  const y = useTransform([rawY, catchUpY], (latest) => (latest[0] as number) + (latest[1] as number))

  /**
   * Jumps `raw` straight to `newValue` — so every tracking update after
   * this is instant and lag-free — while keeping the rendered position
   * exactly where it visually was a moment ago, by loading the entire
   * jump into `catchUp` and animating that back down to 0 with the given
   * `transition`.
   */
  const retarget = (
    raw: typeof rawX,
    catchUp: typeof catchUpX,
    newValue: number,
    transition: SettleTransition,
  ) => {
    const currentRendered = raw.get() + catchUp.get()
    raw.set(newValue)
    catchUp.set(currentRendered - newValue)
    animate(catchUp, 0, transition)
  }

  // Raw tilt target jumps around with every pointer-move delta; springing
  // it — slowly — produces the organic, laggy "swaying" of a card being
  // carried rather than rigidly following the cursor.
  const rawTilt = useMotionValue(0)
  const swayRotate = useSpring(rawTilt, { stiffness: 90, damping: 14, mass: 1.1 })

  // A short playful wiggle fired for tap / drop feedback. Applied to the
  // inner card element (below), not this one, so it pivots about the
  // card's centre rather than the top-edge pinch point the drag sway
  // uses.
  const { angle: wiggleAngle, play: playWiggle } = useWiggle()

  // A card that just landed here from a move gets a one-shot wiggle as it
  // mounts into its new pile — every card of a moved run, cascading by
  // `runPosition` (its index in the run, or -1 if it wasn't part of one).
  // Only the run's head also sparkles, so a long run doesn't set off a
  // wall of them. The ref stops a later state change from replaying it on
  // the same instance.
  const runPosition = useMovedRunPosition(card.id)
  const landedPlayed = useRef(false)
  const [sparkling, setSparkling] = useState(false)
  useEffect(() => {
    if (runPosition < 0 || landedPlayed.current) return
    landedPlayed.current = true
    playWiggle(runPosition * WIGGLE_STAGGER_S)
    if (runPosition === 0) setSparkling(true)
  }, [runPosition, playWiggle])

  // Wiggle triggered by a parent when this card is a follower in a run
  // whose head was tapped (the head wiggles itself, via onClick below).
  // Keyed on the tap nonce so it replays on every tap.
  const groupWiggleNonce = groupWiggle?.nonce
  const groupWiggleOrder = groupWiggle?.order ?? 0
  useEffect(() => {
    if (groupWiggleNonce === undefined) return
    playWiggle(groupWiggleOrder * WIGGLE_STAGGER_S)
  }, [groupWiggleNonce, groupWiggleOrder, playWiggle])

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (liftOnPress) setIsPressed(true)
    // Capture the pointer unconditionally, even for a non-draggable card
    // (e.g. the stock, which is clickable but never dragged). Without
    // this, the slightest pointer drift during a tap can carry the
    // pointerup event onto a different element — one that never calls
    // this card's handlePointerEnd — leaving isPressed stuck true and the
    // card visually lifted forever. Capturing guarantees every subsequent
    // pointer event (move/up/cancel) still reaches this element.
    event.currentTarget.setPointerCapture(event.pointerId)
    if (!draggable) return
    // Register the run with the parent now, on first touch, so every
    // lower card in it is already hooked onto these motion values before
    // any movement — no beat where only the grabbed card responds.
    onPressStart?.({ x, y, rotate: swayRotate })
    const rect = event.currentTarget.getBoundingClientRect()
    restRect.current = { left: rect.left, top: rect.top, width: rect.width }
    startPoint.current = { x: event.clientX, y: event.clientY }
    lastClientX.current = event.clientX
    isDraggingRef.current = false
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!restRect.current) return

    let justStarted = false
    if (!isDraggingRef.current) {
      const moved = Math.hypot(event.clientX - startPoint.current.x, event.clientY - startPoint.current.y)
      if (moved < DRAG_START_THRESHOLD_PX) return
      isDraggingRef.current = true
      wasDragged.current = true
      justStarted = true
      onDragStart?.(card, pileId)
    }

    // Anchor the card's top-center to the pointer, wherever it was grabbed.
    // Uses the card's actual measured width (not the logical CARD_WIDTH
    // constant) so the anchor stays exact even when the board is scaled
    // down to fit a narrow/mobile viewport. The resulting screen-pixel
    // delta is then divided by the stage scale, since a translate applied
    // inside the scaled board gets multiplied by that same factor once
    // rendered.
    const targetLeft = event.clientX - restRect.current.width / 2
    const targetTop = event.clientY
    const targetX = (targetLeft - restRect.current.left) / stageScale
    const targetY = (targetTop - restRect.current.top) / stageScale

    if (justStarted) {
      // The very first move of a drag can jump the anchor a real distance
      // from wherever the card was actually grabbed — ease that one jump
      // in via `retarget` rather than teleporting. `LOCK_ON` finishes
      // fast and exactly, so tracking is pixel-tight immediately after.
      retarget(rawX, catchUpX, targetX, LOCK_ON)
      retarget(rawY, catchUpY, targetY, LOCK_ON)
    } else {
      // Every subsequent move: track the cursor exactly, no smoothing.
      rawX.set(targetX)
      rawY.set(targetY)
    }

    rawTilt.set(clamp((event.clientX - lastClientX.current) * 2.2, -SWAY_MAX_DEG, SWAY_MAX_DEG))
    lastClientX.current = event.clientX
  }

  const handlePointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    setIsPressed(false)
    rawTilt.set(0)
    // Always release the run — a plain tap registered it on press too.
    onPressEnd?.()

    if (isDraggingRef.current) {
      onDragEnd?.()
      const destinationId = registry.findPileAt(event.clientX, event.clientY)
      const moved = destinationId ? onDrop(card, destinationId) : false
      if (!moved) {
        // Snap back to the rest position — the pile it came from hasn't
        // changed, so there's nowhere else for it to go. `retarget` eases
        // it back smoothly instead of teleporting, and a wiggle sells the
        // little "nope" bounce. (A successful drop instead wiggles on the
        // card as it mounts into its new pile — see the landed effect.)
        retarget(rawX, catchUpX, 0, SNAP_BACK)
        retarget(rawY, catchUpY, 0, SNAP_BACK)
        playWiggle()
      }
    }

    isDraggingRef.current = false
    restRect.current = null
  }

  return (
    <motion.div
      // Layout projection (for the cross-pile FLIP animation when a card
      // moves to a different parent) fights with our manual pointer-driven
      // x/y while a card is actively held — Motion tries to compensate for
      // the "unexpected" position/size change with its own corrective
      // transform, which visibly distorts the card's scale mid-drag. Only
      // enabling it when the card isn't currently pressed keeps the FLIP
      // animation for ordinary moves while leaving drags entirely to our
      // own math.
      layout={sharedLayout && !isPressed && !followTransform}
      // Scopes that layout animation to "this card actually changed
      // pile" rather than "something, somewhere in the shared layoutId
      // group, re-rendered". Without this, dropping the top card of a
      // pile can make the card left behind underneath it — whose own
      // position never changed — visibly animate anyway, since Motion
      // otherwise re-measures every layout-enabled sibling on every
      // render and treats any of them as needing a corrective transition.
      layoutDependency={pileId}
      layoutId={sharedLayout ? card.id : undefined}
      className="absolute left-0 top-0 touch-none"
      style={{
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        // Viewing depth for the inner element's rotateY flip. A plain CSS
        // property (not a transform), so it composes cleanly with the
        // pointer-driven x/y/scale on this element.
        perspective: FLIP_PERSPECTIVE_PX,
        ...style,
        x: followTransform?.x ?? x,
        y: followTransform?.y ?? y,
        rotate: followTransform?.rotate ?? swayRotate,
        originX: ANCHOR.x,
        originY: ANCHOR.y,
        zIndex: isPressed || followTransform ? 200 : style?.zIndex,
        cursor: draggable ? (isPressed ? 'grabbing' : 'grab') : 'pointer',
      }}
      initial={false}
      animate={{ scale: isPressed || followTransform ? 1.07 : 1 }}
      transition={{ type: 'spring', stiffness: 420, damping: 34, mass: 0.9 }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onClick={(event: React.MouseEvent) => {
        event.stopPropagation()
        if (wasDragged.current) {
          wasDragged.current = false
          return
        }
        if (liftOnPress) playWiggle()
        onClickMove(card)
      }}
      onDoubleClick={(event: React.MouseEvent) => {
        event.stopPropagation()
        onActivate(card)
      }}
    >
      {/* Radius matches the card faces below so the animated box-shadow
        * traces the visible card edge exactly. No border here: a
        * translucent border sat just inside the shadow's hard 3px lip and
        * read as a doubled, broken edge. */}
      <motion.div
        className="relative h-full w-full rounded-[14px]"
        // Start a just-drawn card back-facing and rotated the *negative*
        // way, so with the parent's perspective it turns over front-first
        // from the left edge across to the right, rather than revealing
        // right-to-left.
        initial={revealOnMount ? { rotateY: -180 } : false}
        animate={{
          rotateY: card.faceUp ? 0 : 180,
          // `followTransform` set means this card is part of a run being
          // carried — it lifts with the grabbed card, not just tracks it.
          y: isPressed || followTransform ? -14 : 0,
          boxShadow: isPressed || followTransform ? LIFT_SHADOW : REST_SHADOW,
        }}
        transition={{
          // Slow, decelerating turn so the 3-D roll-over is legible
          // instead of snapping through edge-on like a flat spin.
          rotateY: { duration: 0.85, ease: [0.22, 0.68, 0.24, 1] },
          default: { type: 'spring', stiffness: 380, damping: 26 },
        }}
        // `rotate` (the wiggle) pivots about this element's centre — its
        // default transform origin — giving an even side-to-side shake
        // instead of the top-anchored swing the outer element uses while
        // dragging. `preserve-3d` keeps the two faces in depth so the
        // parent's `perspective` turns the rotateY into a real flip.
        style={{ transformStyle: 'preserve-3d', rotate: wiggleAngle }}
      >
        <div className="absolute inset-0 [backface-visibility:hidden]">
          <CardFace card={card} />
        </div>
        <div
          className="absolute inset-0 [backface-visibility:hidden]"
          style={{ transform: 'rotateY(180deg)' }}
        >
          <CardBack variant={cardBack} />
        </div>
      </motion.div>

      {sparkling && <SparkleBurst onComplete={() => setSparkling(false)} />}
    </motion.div>
  )
}
