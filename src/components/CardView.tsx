import { motion, useMotionValue, useSpring, type PanInfo } from 'motion/react'
import { useRef, useState } from 'react'
import type { Card } from '../domain/Card'
import { useDropRegistry } from '../lib/DropRegistryContext'
import { CARD_HEIGHT, CARD_WIDTH } from '../lib/layout'
import { CardBack } from './CardBack'
import { CardFace } from './CardFace'

interface CardViewProps {
  card: Card
  pileId: string
  draggable: boolean
  selected: boolean
  style?: React.CSSProperties
  onDrop: (card: Card, destinationPileId: string) => boolean
  onSelect: (card: Card, pileId: string) => void
  onActivate: (card: Card) => void
}

const REST_SHADOW =
  '0 3px 0 rgba(15,15,20,0.35), 0 8px 14px rgba(15,15,20,0.28)'
const LIFT_SHADOW =
  '0 10px 0 rgba(15,15,20,0.3), 0 22px 30px rgba(15,15,20,0.38)'

const SWAY_MAX_DEG = 16
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export function CardView({
  card,
  pileId,
  draggable,
  selected,
  style,
  onDrop,
  onSelect,
  onActivate,
}: CardViewProps) {
  const registry = useDropRegistry()
  const wasDragged = useRef(false)
  const cardRef = useRef<HTMLDivElement>(null)
  // Lifts the instant the card is grabbed (pointer down), not just once an
  // actual drag is recognized — a real card lifts as soon as you pinch it.
  const [isPressed, setIsPressed] = useState(false)
  // Where on the card it was grabbed, as a 0..1 fraction of its box. Used
  // as the rotation pivot so the card sways around your grip rather than
  // its own center, like a real card held between two fingers.
  const [origin, setOrigin] = useState({ x: 0.5, y: 0.5 })

  // Raw tilt target jumps around with every pointer-move delta; springing
  // it — slowly — produces the organic, laggy "swaying" of a card being
  // carried rather than rigidly following the cursor.
  const rawTilt = useMotionValue(0)
  const swayRotate = useSpring(rawTilt, { stiffness: 90, damping: 14, mass: 1.1 })

  const handlePointerDown = (event: React.PointerEvent) => {
    setIsPressed(true)
    const rect = cardRef.current?.getBoundingClientRect()
    if (rect && rect.width > 0 && rect.height > 0) {
      setOrigin({
        x: clamp((event.clientX - rect.left) / rect.width, 0, 1),
        y: clamp((event.clientY - rect.top) / rect.height, 0, 1),
      })
    }
  }

  const handlePointerEnd = () => setIsPressed(false)

  const handleDragStart = () => {
    wasDragged.current = true
  }

  const handleDrag = (_event: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => {
    rawTilt.set(clamp(info.delta.x * 2.2, -SWAY_MAX_DEG, SWAY_MAX_DEG))
  }

  const handleDragEnd = (_event: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => {
    setIsPressed(false)
    rawTilt.set(0)
    const destinationId = registry.findPileAt(info.point.x, info.point.y)
    if (destinationId && destinationId !== pileId) {
      onDrop(card, destinationId)
    }
  }

  return (
    <motion.div
      ref={cardRef}
      layout
      layoutId={card.id}
      className="absolute left-0 top-0 cursor-pointer touch-none"
      style={{
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        rotate: swayRotate,
        originX: origin.x,
        originY: origin.y,
        ...style,
      }}
      initial={false}
      transition={{ type: 'spring', stiffness: 420, damping: 34, mass: 0.9 }}
      drag={draggable}
      dragSnapToOrigin
      dragElastic={0.35}
      dragTransition={{ bounceStiffness: 500, bounceDamping: 28 }}
      whileDrag={{ scale: 1.07, zIndex: 200, cursor: 'grabbing' }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onDragStart={handleDragStart}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
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
          <CardBack />
        </div>
      </motion.div>
    </motion.div>
  )
}
