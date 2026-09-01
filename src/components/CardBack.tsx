import {
  CARD_BACK_GRADIENTS,
  DEFAULT_CARD_BACK,
  type CardBackId,
  type GeometricCardBackId,
} from '../lib/cardBacks'

interface CardBackProps {
  variant?: CardBackId
}

/** The card back — `classic` is a traditional bordered red design, every
 * other variant is a playful geometric grid tinted by its gradient. No
 * external art assets either way. */
export function CardBack({ variant = DEFAULT_CARD_BACK }: CardBackProps) {
  if (variant === 'classic') return <ClassicBack />
  return <GeometricBack variant={variant} />
}

/** Traditional playing-card back: white margin, crimson field, a fine
 * diagonal lattice, a keyline frame and a diamond medallion. */
function ClassicBack() {
  return (
    <div className="h-full w-full rounded-[14px] bg-[#f7f2e7] p-[3px]">
      <div className="relative h-full w-full overflow-hidden rounded-[11px] bg-[#c1121f]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: [
              'repeating-linear-gradient(45deg, rgba(255,255,255,0.16) 0 1.5px, transparent 1.5px 8px)',
              'repeating-linear-gradient(-45deg, rgba(255,255,255,0.16) 0 1.5px, transparent 1.5px 8px)',
            ].join(','),
          }}
        />
        <div className="absolute inset-[6px] rounded-[7px] border border-[#f7f2e7]/50" />
        <div className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[4px] border-2 border-[#f7f2e7]/70 bg-[#a50f1b]" />
      </div>
    </div>
  )
}

function GeometricBack({ variant }: { variant: GeometricCardBackId }) {
  return (
    <div
      className={`h-full w-full overflow-hidden rounded-[14px] bg-gradient-to-br p-[6px] ${CARD_BACK_GRADIENTS[variant]}`}
    >
      <div className="grid h-full w-full grid-cols-3 grid-rows-4 gap-[3px] rounded-lg bg-white/10 p-1.5">
        {Array.from({ length: 12 }, (_, i) => (
          <div
            key={i}
            className="rounded-[3px] bg-white/25"
            style={{ opacity: (i % 4) * 0.2 + 0.35 }}
          />
        ))}
      </div>
    </div>
  )
}
