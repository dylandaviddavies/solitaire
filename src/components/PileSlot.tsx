import { useEffect, useRef, type ReactNode } from 'react'
import { useDropRegistry } from '../lib/DropRegistryContext'
import { CARD_HEIGHT, CARD_WIDTH } from '../lib/layout'

interface PileSlotProps {
  pileId: string
  minHeight?: number
  onClick?: () => void
  placeholder?: ReactNode
  showPlaceholder: boolean
  /** True while a card is being dragged and this pile would currently
   * accept it — draws a highlighted outline over the whole zone (cards
   * and all), distinct from the dashed "empty pile" placeholder below. */
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
          className="absolute inset-0 rounded-2xl border-[3px] border-dashed border-white/35"
          style={{ height: CARD_HEIGHT }}
        >
          {placeholder}
        </div>
      )}
      {children}
      {dropTarget && (
        <div className="pointer-events-none absolute inset-0 z-20 rounded-2xl border-[3px] border-emerald-400 bg-emerald-400/10 shadow-[0_0_0_4px_rgba(52,211,153,0.25),0_0_18px_rgba(52,211,153,0.55)]" />
      )}
    </div>
  )
}
