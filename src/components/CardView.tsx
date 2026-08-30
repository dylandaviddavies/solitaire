import { animate, motion, useMotionValue, useSpring, useTransform } from 'motion/react'
import { useRef, useState } from 'react'
import type { Card } from '../domain/Card'
import { useCardBackPreference } from '../hooks/useCardBackPreference'
import { useDropRegistry } from '../lib/DropRegistryContext'
import { CARD_HEIGHT, CARD_WIDTH } from '../lib/layout'
import { useStageScale } from '../lib/StageScaleContext'
import { CardBack } from './CardBack'
import { CardFace } from './CardFace'

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
  selected: boolean
  /** True for the one card that just landed here face-up from a fresh
   * mount (e.g. a stock draw) — it should visibly flip in rather than
   * just appear, since normal same-pile re-renders already flip smoothly
   * on their own. */
  revealOnMount?: boolean
  style?: React.CSSProperties
  onDrop: (card: Card, destinationPileId: string) => boolean
  onSelect: (card: Card, pileId: string) => void
  onActivate: (card: Card) => void
  /** Optional: omitted for cards that can never be dragged (e.g. the
   * stock's face-down top, or a "peek" card rendered just to fill in the
   * pile visually — see WastePileView/FoundationSlotView/StockPileView). */
  onDragStart?: (card: Card, pileId: string) => void
  onDragEnd?: () => void
  /** Fires once, right as a real drag begins, handing up this card's own
   * live position/rotation motion values so a parent (e.g.
   * TableauColumnView) can pass them to the other cards in the same run
   * as `followTransform`, making the whole run drag together instead of
   * just the one card that was grabbed. */
  onDragTransform?: (transform: DragTransform) => void
  /** When set, this card is part of a run whose base is being dragged
   * elsewhere: it mirrors that card's position/rotation exactly instead
   * of driving its own, and skips its own layout/press styling. */
  followTransform?: DragTransform
}

const REST_SHADOW =
  '0 3px 0 rgba(15,15,20,0.35), 0 8px 14px rgba(15,15,20,0.28)'
const LIFT_SHADOW =
  '0 10px 0 rgba(15,15,20,0.3), 0 22px 30px rgba(15,15,20,0.38)'

const SWAY_MAX_DEG = 16
const DRAG_START_THRESHOLD_PX = 4
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

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
  selected,
  revealOnMount,
  style,
  onDrop,
  onSelect,
  onActivate,
  onDragStart,
  onDragEnd,
  onDragTransform,
  followTransform,
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
  const catchUpSpring = { type: 'spring' as const, stiffness: 480, damping: 34, mass: 0.6 }

  /**
   * Jumps `raw` straight to `newValue` — so every tracking update after
   * this is instant and lag-free — while keeping the rendered position
   * exactly where it visually was a moment ago, by loading the entire
   * jump into `catchUp` and animating that back down to 0.
   */
  const retarget = (
    raw: typeof rawX,
    catchUp: typeof catchUpX,
    newValue: number,
  ) => {
    const currentRendered = raw.get() + catchUp.get()
    raw.set(newValue)
    catchUp.set(currentRendered - newValue)
    animate(catchUp, 0, catchUpSpring)
  }

  // Raw tilt target jumps around with every pointer-move delta; springing
  // it — slowly — produces the organic, laggy "swaying" of a card being
  // carried rather than rigidly following the cursor.
  const rawTilt = useMotionValue(0)
  const swayRotate = useSpring(rawTilt, { stiffness: 90, damping: 14, mass: 1.1 })

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    setIsPressed(true)
    // Capture the pointer unconditionally, even for a non-draggable card
    // (e.g. the stock, which is clickable but never dragged). Without
    // this, the slightest pointer drift during a tap can carry the
    // pointerup event onto a different element — one that never calls
    // this card's handlePointerEnd — leaving isPressed stuck true and the
    // card visually lifted forever. Capturing guarantees every subsequent
    // pointer event (move/up/cancel) still reaches this element.
    event.currentTarget.setPointerCapture(event.pointerId)
    if (!draggable) return
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
      // Hand up this card's own live motion values so a parent (e.g.
      // TableauColumnView) can pass them along to the other cards in the
      // same run as `followTransform`, making the whole run drag as one
      // unit instead of just the card that was actually grabbed.
      onDragTransform?.({ x, y, rotate: swayRotate })
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
      // in via `retarget` rather than teleporting.
      retarget(rawX, catchUpX, targetX)
      retarget(rawY, catchUpY, targetY)
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

    if (isDraggingRef.current) {
      onDragEnd?.()
      const destinationId = registry.findPileAt(event.clientX, event.clientY)
      const moved = destinationId ? onDrop(card, destinationId) : false
      if (!moved) {
        // Snap back to the rest position — the pile it came from hasn't
        // changed, so there's nowhere else for it to go. `retarget` eases
        // it back smoothly instead of teleporting.
        retarget(rawX, catchUpX, 0)
        retarget(rawY, catchUpY, 0)
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
      layout={!isPressed && !followTransform}
      // Scopes that layout animation to "this card actually changed
      // pile" rather than "something, somewhere in the shared layoutId
      // group, re-rendered". Without this, dropping the top card of a
      // pile can make the card left behind underneath it — whose own
      // position never changed — visibly animate anyway, since Motion
      // otherwise re-measures every layout-enabled sibling on every
      // render and treats any of them as needing a corrective transition.
      layoutDependency={pileId}
      layoutId={card.id}
      className="absolute left-0 top-0 touch-none"
      style={{
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
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
        onSelect(card, pileId)
      }}
      onDoubleClick={(event: React.MouseEvent) => {
        event.stopPropagation()
        onActivate(card)
      }}
    >
      <motion.div
        className="relative h-full w-full rounded-[16px] border-[3px] border-black/15"
        initial={revealOnMount ? { rotateY: 180 } : false}
        animate={{
          rotateY: card.faceUp ? 0 : 180,
          y: selected || isPressed ? -14 : 0,
          boxShadow: selected || isPressed ? LIFT_SHADOW : REST_SHADOW,
        }}
        transition={{
          rotateY: { duration: 0.7, ease: 'easeInOut' },
          default: { type: 'spring', stiffness: 380, damping: 26 },
        }}
        style={{ transformStyle: 'preserve-3d' }}
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
    </motion.div>
  )
}
