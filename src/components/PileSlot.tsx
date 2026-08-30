import { useEffect, useRef, type ReactNode } from 'react'
import { AnimatePresence } from 'motion/react'
import { useDropRegistry } from '../lib/DropRegistryContext'
import { CARD_HEIGHT, CARD_WIDTH } from '../lib/layout'
import { DropZoneHint } from './DropZoneHint'
import { DASHED_PILE_OUTLINE } from './pileStyles'

interface PileSlotProps {
  pileId: string
  minHeight?: number
  onClick?: () => void
  placeholder?: ReactNode
  showPlaceholder: boolean
  /** True while a card is being dragged and this pile is a kind of place
   * a card could ever be dropped — draws a neutral dashed outline over
   * the whole zone (cards and all). Deliberately not filtered by whether
   * *this* drag would actually be legal here — that would just tell the
   * player where the correct move is. Distinct from the dashed "empty
   * pile" placeholder below, which shows regardless of dragging. */
  dropTarget?: boolean
  children: ReactNode
  className?: string
}

/**
 * Registers a pile's on-screen bounds with the shared `DropRegistry` so
 * dragged cards can be hit-tested against it, and renders the empty-pile
 * placeholder outline shared by every pile type.
 */
export function PileSlot({
  pileId,
  minHeight,
  onClick,
  placeholder,
  showPlaceholder,
  dropTarget = false,
  children,
  className = '',
}: PileSlotProps) {
  const registry = useDropRegistry()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ref.current) return registry.register(pileId, ref.current)
  }, [registry, pileId])

  return (
    <div
      ref={ref}
      data-pile-id={pileId}
      onClick={onClick}
      className={`relative rounded-2xl ${className}`}
      style={{ width: CARD_WIDTH, minHeight: minHeight ?? CARD_HEIGHT }}
    >
      {showPlaceholder && (
        <div
          className={`absolute inset-0 border-white/35 ${DASHED_PILE_OUTLINE}`}
          style={{ height: CARD_HEIGHT }}
        >
          {placeholder}
        </div>
      )}
      {children}
      <AnimatePresence>{dropTarget && <DropZoneHint />}</AnimatePresence>
    </div>
  )
}
