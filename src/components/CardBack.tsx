import { CARD_BACK_GRADIENTS, DEFAULT_CARD_BACK, type CardBackId } from '../lib/cardBacks'

interface CardBackProps {
  variant?: CardBackId
}

/** Playful, colorful card back — geometric, no external art assets. */
export function CardBack({ variant = DEFAULT_CARD_BACK }: CardBackProps) {
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
