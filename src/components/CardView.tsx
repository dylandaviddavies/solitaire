import { motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import type { Card } from '../domain/Card'
import { useCardBackPreference } from '../hooks/useCardBackPreference'
import { useCardDrag, type DragTransform } from '../hooks/useCardDrag'
import { useWiggle } from '../hooks/useWiggle'
import {
  ARRIVE_SPRING,
  DRAW_FLIP,
  DROP_SETTLE,
  FLIP_ROLL_SPRING,
  LIFT_SCALE,
  LIFT_SHADOW,
  LIFT_TRANSLATE_Y,
  PRESS_SPRING,
  REST_SHADOW,
  SQUASH_SPRING,
  SQUASH_X,
  SQUASH_Y,
} from '../lib/animation'
import { CARD_HEIGHT, CARD_WIDTH } from '../lib/layout'
import { useFlipOffset, useMovedRunPosition, useRejectedNonce } from '../lib/LastMoveContext'
import { useReducedMotionValue } from '../lib/MotionPrefContext'
import { CardBack } from './CardBack'
import { CardFace } from './CardFace'
import { SparkleBurst } from './SparkleBurst'

export type { DragTransform }

interface CardViewProps {
  card: Card
  pileId: string
  draggable: boolean
  /** True for the one card that just landed here face-up from a fresh
   * mount (a stock draw) — it turns over as it arrives. The slide across
   * from the stock comes from the flip-offset system like any other move;
   * this only adds the face turn and stretches its timing to match. */
  revealOnMount?: boolean
  style?: React.CSSProperties
  /** The interaction callbacks are all optional — a "peek" card rendered
   * just to fill a pile in visually wires up none of them. */
  onDrop?: (card: Card, destinationPileId: string) => boolean
  /** A plain click/tap (no drag): send this card to its best legal
   * destination. */
  onClickMove?: (card: Card) => void
  onActivate?: (card: Card) => void
  /** Omitted for cards that can never be dragged (the stock's face-down
   * top, or a "peek" card rendered just to fill a pile in visually). */
  onDragStart?: (card: Card, pileId: string) => void
  /** Drag released. `offset` is where the card sits relative to its slot
   * in board space — passed on a landed drop so the glide home starts from
   * the cursor, and `null` on an invalid drop. */
  onDragEnd?: (offset: { x: number; y: number } | null) => void
  /** Fires the instant this card is pressed (before any movement), handing
   * up its live motion values so a parent (e.g. TableauColumnView) can
   * hook the rest of the run onto them right away — the whole run then
   * lifts and moves as one from first touch. `onPressEnd` fires on
   * release/cancel whether or not a drag actually happened. */
  onPressStart?: (transform: DragTransform) => void
  onPressEnd?: () => void
  /** When set, this card is part of a run whose base is being dragged
   * elsewhere: it mirrors that card's motion values exactly instead of
   * driving its own. */
  followTransform?: DragTransform
}

// Viewer distance for the face-up flip's rotateY. Without a perspective
// the turn is a flat horizontal squash; kept short relative to the card so
// it has obvious depth — the leading half bulges toward the viewer.
const FLIP_PERSPECTIVE_PX = 380

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
}: CardViewProps) {
  const cardBack = useCardBackPreference()
  const reduced = useReducedMotionValue()
  const { angle: wiggleAngle, play: playWiggle } = useWiggle(!reduced)

  // A card that just changed piles mounts already offset by `entry` — the
  // board-space vector from its new slot back to where it visually was —
  // and `useCardDrag` eases it to zero, so it glides in from its real
  // previous spot instead of blinking to the new pile. `useFlipOffset`
  // only carries a value on the render that first mounts a just-moved
  // card; every consumer of it here is mount-only, so it needs no ref.
  const entry = useFlipOffset(card.id)
  const entryTransition = revealOnMount
    ? DRAW_FLIP
    : entry?.dragged
      ? DROP_SETTLE
      : ARRIVE_SPRING

  const drag = useCardDrag({
    draggable,
    entryOffset: entry ? { dx: entry.dx, dy: entry.dy } : undefined,
    entryTransition,
    onPressStart,
    onPressEnd,
    onDragStart: () => onDragStart?.(card, pileId),
    onDragEnd,
    onDrop: (destinationId) => onDrop?.(card, destinationId) ?? false,
    onInvalidDrop: playWiggle,
    reducedMotion: reduced,
  })
  // The card lifts / shows the grabbing cursor only once a real drag is
  // running (or it's a follower in a run whose base is being dragged) —
  // never on a plain click.
  const lifted = drag.isDragging || Boolean(followTransform)

  // The head of a run that just landed here sparkles as it mounts — the
  // "it worked" counterpart to the refused-move wiggle. The ref stops a
  // later state change from replaying it on the same instance.
  const runPosition = useMovedRunPosition(card.id)
  const sparkledOnMove = useRef(false)
  const [sparkling, setSparkling] = useState(false)
  useEffect(() => {
    if (runPosition !== 0 || sparkledOnMove.current || reduced) return
    sparkledOnMove.current = true
    setSparkling(true)
  }, [runPosition, reduced])

  // Shake this card when the engine turns its move down — a drop onto a
  // pile that can't take it, a tap with nowhere legal to go. Keyed on the
  // rejection nonce so a repeat rejection replays it. The nonce seen at
  // mount is ignored: a card can mount fresh (resurfacing on the waste as
  // the card above it is drawn or played) while `lastMove.rejected` still
  // points at it from an earlier refusal, and that stale shake mustn't
  // replay — only a *new* rejection, which bumps the nonce, should fire.
  const rejectedNonce = useRejectedNonce(card.id)
  const wiggledForNonce = useRef(rejectedNonce)
  useEffect(() => {
    if (rejectedNonce === null || rejectedNonce === wiggledForNonce.current) return
    wiggledForNonce.current = rejectedNonce
    playWiggle()
  }, [rejectedNonce, playWiggle])

  return (
    <motion.div
      // Cross-pile motion is driven by hand from computed board-space
      // positions (`useCardDrag`) — not Motion's `layout` projection,
      // which fought the pointer-driven x/y and misjudged start positions
      // under the board's `scale()` transform.
      className="absolute left-0 top-0 touch-none"
      style={{
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        // Plain CSS property (not a transform) so it composes cleanly with
        // the pointer-driven x/y/scale on this element.
        perspective: FLIP_PERSPECTIVE_PX,
        ...style,
        x: followTransform?.x ?? drag.x,
        y: followTransform?.y ?? drag.y,
        rotate: followTransform?.rotate ?? drag.rotate,
        originX: drag.anchor.x,
        originY: drag.anchor.y,
        zIndex: lifted ? 200 : style?.zIndex,
        // Plain pointer on hover — only a drag in progress shows the fist.
        cursor: lifted ? 'grabbing' : 'pointer',
      }}
      // Squash-and-stretch: a grabbed card pinches taller/narrower then
      // springs to the lift scale; a card landing from a drag mounts
      // splatted wider/shorter and recovers. `MotionConfig` flattens all
      // of this under reduced motion.
      initial={entry?.dragged && !reduced ? { scaleX: 1 / SQUASH_X, scaleY: 1 / SQUASH_Y } : false}
      animate={{
        scaleX: lifted ? [SQUASH_X, LIFT_SCALE] : 1,
        scaleY: lifted ? [SQUASH_Y, LIFT_SCALE] : 1,
      }}
      transition={{ scaleX: SQUASH_SPRING, scaleY: SQUASH_SPRING, default: PRESS_SPRING }}
      {...drag.handlers}
      onClick={(event: React.MouseEvent) => {
        event.stopPropagation()
        if (drag.consumeWasDrag()) return
        onClickMove?.(card)
      }}
      onDoubleClick={(event: React.MouseEvent) => {
        event.stopPropagation()
        onActivate?.(card)
      }}
    >
      {/* Radius matches the card faces so the animated box-shadow traces
        * the visible edge exactly. No border: a translucent one sat just
        * inside the shadow's hard lip and read as a doubled, broken edge. */}
      <motion.div
        className="relative h-full w-full rounded-[14px]"
        // Start a just-drawn card back-facing and rotated the *negative*
        // way, so with the parent's perspective it turns over front-first
        // from the left edge across to the right.
        initial={revealOnMount ? { rotateY: -180 } : false}
        animate={{
          rotateY: card.faceUp ? 0 : 180,
          y: lifted ? LIFT_TRANSLATE_Y : 0,
          boxShadow: lifted ? LIFT_SHADOW : REST_SHADOW,
        }}
        transition={{
          // The 3-D roll-over shares the stock → waste slide's slow curve
          // so the turn and the travel read as one motion.
          rotateY: DRAW_FLIP,
          default: FLIP_ROLL_SPRING,
        }}
        // The wiggle pivots about this element's centre (its default
        // origin) for an even side-to-side shake, not the top-anchored
        // swing the outer element uses while dragging. `preserve-3d` keeps
        // the two faces in depth so the parent's perspective makes the
        // rotateY a real flip.
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
