import { motion, useMotionValue, useSpring } from 'motion/react'
import { useRef, useState } from 'react'
import type { Card } from '../domain/Card'
import { useCardBackPreference } from '../hooks/useCardBackPreference'
import { useDropRegistry } from '../lib/DropRegistryContext'
import { CARD_HEIGHT, CARD_WIDTH } from '../lib/layout'
import { useStageScale } from '../lib/StageScaleContext'
import { CardBack } from './CardBack'
import { CardFace } from './CardFace'

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

  // The raw target position jumps straight to the pointer on every move;
  // springing it into `x`/`y` makes the card glide toward the cursor
  // instead of teleporting there, while still feeling responsive enough
  // to track a drag.
  const rawX = useMotionValue(0)
  const rawY = useMotionValue(0)
  const dragSpring = { stiffness: 480, damping: 34, mass: 0.6 }
  const x = useSpring(rawX, dragSpring)
  const y = useSpring(rawY, dragSpring)

  // Raw tilt target jumps around with every pointer-move delta; springing
  // it — slowly — produces the organic, laggy "swaying" of a card being
  // carried rather than rigidly following the cursor.
  const rawTilt = useMotionValue(0)
  const swayRotate = useSpring(rawTilt, { stiffness: 90, damping: 14, mass: 1.1 })

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    setIsPressed(true)
    if (!draggable) return
    const rect = event.currentTarget.getBoundingClientRect()
    restRect.current = { left: rect.left, top: rect.top, width: rect.width }
    startPoint.current = { x: event.clientX, y: event.clientY }
    lastClientX.current = event.clientX
    isDraggingRef.current = false
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!restRect.current) return

    if (!isDraggingRef.current) {
      const moved = Math.hypot(event.clientX - startPoint.current.x, event.clientY - startPoint.current.y)
      if (moved < DRAG_START_THRESHOLD_PX) return
      isDraggingRef.current = true
      wasDragged.current = true
      onDragStart?.(card, pileId)
    }

    // Anchor the card's top-center to the pointer, wherever it was grabbed.
    // Setting the raw target (rather than x/y directly) lets the spring
    // above ease the card toward it instead of snapping instantly. Uses
    // the card's actual measured width (not the logical CARD_WIDTH
    // constant) so the anchor stays exact even when the board is scaled
    // down to fit a narrow/mobile viewport. The resulting screen-pixel
    // delta is then divided by the stage scale, since a translate applied
    // inside the scaled board gets multiplied by that same factor once
    // rendered.
    const targetLeft = event.clientX - restRect.current.width / 2
    const targetTop = event.clientY
    rawX.set((targetLeft - restRect.current.left) / stageScale)
    rawY.set((targetTop - restRect.current.top) / stageScale)

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
        // changed, so there's nowhere else for it to go. Retargeting the
        // raw values lets the same following-spring ease it back smoothly.
        rawX.set(0)
        rawY.set(0)
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
      layout={!isPressed}
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
        x,
        y,
        rotate: swayRotate,
        originX: ANCHOR.x,
        originY: ANCHOR.y,
        zIndex: isPressed ? 200 : style?.zIndex,
        cursor: draggable ? (isPressed ? 'grabbing' : 'grab') : 'pointer',
      }}
      initial={false}
      animate={{ scale: isPressed ? 1.07 : 1 }}
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
