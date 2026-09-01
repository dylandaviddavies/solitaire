import { useEffect, useRef, useState } from 'react'
import {
  animate,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
  type Transition,
} from 'motion/react'
import {
  DRAG_ACTIVATE_MS,
  DRAG_COMMIT_PX,
  DRAG_START_THRESHOLD_PX,
  LOCK_ON,
  SNAP_BACK,
  SWAY_MAX_DEG,
  SWAY_SPRING,
} from '../lib/animation'
import { useDropRegistry } from '../lib/DropRegistryContext'
import { useStageScale } from '../lib/StageScaleContext'

/** The live position/rotation of a card, shared with the other cards in
 * its run so they can visually follow along while it's dragged. */
export interface DragTransform {
  x: MotionValue<number>
  y: MotionValue<number>
  rotate: MotionValue<number>
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
// The card is always "held" by its top-center, like pinching the top edge
// between two fingers — not by whichever pixel you happened to click. That
// exact point follows the pointer and the sway pivots from it, so every
// drag behaves identically (Balatro-style) instead of varying with where
// on the card you grabbed it.
const ANCHOR_X = 0.5
const ANCHOR_Y = 0

interface UseCardDragOptions {
  draggable: boolean
  /** Whether pressing should lift the card under the pointer. */
  liftOnPress: boolean
  /** Board-space offset the card mounts at (its previous on-screen spot
   * relative to its new slot); eased to zero on mount with
   * `entryTransition`. */
  entryOffset?: { dx: number; dy: number }
  entryTransition: Transition
  onPressStart?: (transform: DragTransform) => void
  onPressEnd?: () => void
  onDragStart?: () => void
  onDragEnd?: (offset: { x: number; y: number } | null) => void
  /** Attempt the drop; returns whether it was accepted. */
  onDrop: (destinationPileId: string) => boolean
  /** A drag that ended on nothing / an invalid pile — for the "nope"
   * wiggle. The snap back to rest is handled here. */
  onInvalidDrop?: () => void
  /** Pare the motion back: the entry glide and snap-back are instant and
   * the carry sway is skipped. */
  reducedMotion?: boolean
}

const INSTANT: Transition = { duration: 0 }

/**
 * The whole pointer lifecycle of a card: it arrives (glides in from its
 * previous spot), tracks the cursor pixel-tight while dragged, and settles
 * (drops into place, or snaps back). Position is a pair of motion values
 * (`rawX/Y` — set directly, never sprung — plus a short-lived `catchUpX/Y`
 * that lets settle transitions ease without adding per-frame tracking
 * lag), summed into `x`/`y` for the element's transform.
 */
export function useCardDrag({
  draggable,
  liftOnPress,
  entryOffset,
  entryTransition,
  onPressStart,
  onPressEnd,
  onDragStart,
  onDragEnd,
  onDrop,
  onInvalidDrop,
  reducedMotion = false,
}: UseCardDragOptions) {
  const settle = reducedMotion ? INSTANT : SNAP_BACK
  const entryEase = reducedMotion ? INSTANT : entryTransition
  const registry = useDropRegistry()
  // The board is uniformly scaled to fit the viewport (see ResponsiveStage);
  // a translate set inside that scaled subtree is multiplied by the same
  // factor on screen, so screen-pixel pointer deltas are divided by it.
  const stageScale = useStageScale()

  const [isPressed, setIsPressed] = useState(false)
  const wasDragged = useRef(false)
  const isDragging = useRef(false)
  // Measured at grab time: the card's on-screen rest left/top and its
  // actual rendered width (not the logical constant — the board may be
  // scaled), so every pointer position converts to a translate offset.
  const restRect = useRef<{ left: number; top: number; width: number } | null>(null)
  const startPoint = useRef({ x: 0, y: 0 })
  const pressedAt = useRef(0)
  const lastClientX = useRef(0)

  const rawX = useMotionValue(entryOffset?.dx ?? 0)
  const rawY = useMotionValue(entryOffset?.dy ?? 0)
  const catchUpX = useMotionValue(0)
  const catchUpY = useMotionValue(0)
  const x = useTransform([rawX, catchUpX], ([raw, catchUp]) => (raw as number) + (catchUp as number))
  const y = useTransform([rawY, catchUpY], ([raw, catchUp]) => (raw as number) + (catchUp as number))

  // Slow-springs the tilt behind the cursor for an organic "sway".
  const rawTilt = useMotionValue(0)
  const rotate = useSpring(rawTilt, SWAY_SPRING)

  /**
   * Jumps `raw` straight to `newValue` — so tracking after this is instant
   * and lag-free — while keeping the rendered position where it visually
   * was, by loading the jump into `catchUp` and easing that to zero.
   */
  const retarget = (
    raw: MotionValue<number>,
    catchUp: MotionValue<number>,
    newValue: number,
    transition: Transition,
  ) => {
    const rendered = raw.get() + catchUp.get()
    raw.set(newValue)
    catchUp.set(rendered - newValue)
    animate(catchUp, 0, transition)
  }

  // Ease the entry offset to zero, once, on mount.
  const stopEntry = useRef<() => void>(() => {})
  useEffect(() => {
    if (!entryOffset) return
    const ax = animate(rawX, 0, entryEase)
    const ay = animate(rawY, 0, entryEase)
    stopEntry.current = () => {
      ax.stop()
      ay.stop()
    }
    return stopEntry.current
    // Mount-only: entryOffset is frozen by the caller and the motion
    // values are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (liftOnPress) setIsPressed(true)
    // Grabbing a card mid-glide hands control to the pointer.
    stopEntry.current()
    // Capture unconditionally, even for a non-draggable card (the stock is
    // clickable but never dragged): the slightest drift during a tap can
    // otherwise carry the pointerup onto a different element, leaving this
    // card stuck lifted. Capturing keeps every move/up/cancel on us.
    event.currentTarget.setPointerCapture(event.pointerId)
    if (!draggable) return
    // Register the run with the parent now, on first touch, so its lower
    // cards are hooked onto these motion values before any movement.
    onPressStart?.({ x, y, rotate })
    const rect = event.currentTarget.getBoundingClientRect()
    restRect.current = { left: rect.left, top: rect.top, width: rect.width }
    startPoint.current = { x: event.clientX, y: event.clientY }
    pressedAt.current = performance.now()
    lastClientX.current = event.clientX
    isDragging.current = false
  }

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!restRect.current) return

    let justStarted = false
    if (!isDragging.current) {
      const moved = Math.hypot(
        event.clientX - startPoint.current.x,
        event.clientY - startPoint.current.y,
      )
      // A decisive pull starts the drag immediately; a gentler drift has
      // to clear both the short hold and the small movement threshold, so
      // a tap that wobbles a few pixels isn't mistaken for a drag.
      if (moved < DRAG_COMMIT_PX) {
        if (performance.now() - pressedAt.current < DRAG_ACTIVATE_MS) return
        if (moved < DRAG_START_THRESHOLD_PX) return
      }
      isDragging.current = true
      wasDragged.current = true
      justStarted = true
      onDragStart?.()
    }

    // Anchor the card's top-center to the pointer.
    const targetLeft = event.clientX - restRect.current.width / 2
    const targetX = (targetLeft - restRect.current.left) / stageScale
    const targetY = (event.clientY - restRect.current.top) / stageScale

    if (justStarted) {
      // The first move can jump the anchor a real distance from where the
      // card was grabbed — ease that one jump in rather than teleporting.
      retarget(rawX, catchUpX, targetX, LOCK_ON)
      retarget(rawY, catchUpY, targetY, LOCK_ON)
    } else {
      rawX.set(targetX)
      rawY.set(targetY)
    }

    if (!reducedMotion) {
      rawTilt.set(clamp((event.clientX - lastClientX.current) * 2.2, -SWAY_MAX_DEG, SWAY_MAX_DEG))
    }
    lastClientX.current = event.clientX
  }

  const onPointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    setIsPressed(false)
    rawTilt.set(0)
    onPressEnd?.()

    if (isDragging.current) {
      const destinationId = registry.findPileAt(event.clientX, event.clientY)
      // Hand up where the card currently sits so a landed drop glides home
      // from the cursor rather than snapping back to the slot first.
      onDragEnd?.({ x: rawX.get(), y: rawY.get() })
      const moved = destinationId ? onDrop(destinationId) : false
      if (!moved) {
        onDragEnd?.(null)
        retarget(rawX, catchUpX, 0, settle)
        retarget(rawY, catchUpY, 0, settle)
        onInvalidDrop?.()
      }
    }

    isDragging.current = false
    restRect.current = null
  }

  return {
    x,
    y,
    rotate,
    isPressed,
    anchor: { x: ANCHOR_X, y: ANCHOR_Y },
    /** True (once) if the gesture just ended was a drag, not a tap — call
     * from the click handler to swallow the click that follows a drag. */
    consumeWasDrag: () => {
      if (!wasDragged.current) return false
      wasDragged.current = false
      return true
    },
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: onPointerEnd,
      onPointerCancel: onPointerEnd,
    },
  }
}
