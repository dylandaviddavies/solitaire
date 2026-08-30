import { AnimatePresence, motion } from 'motion/react'
import { BACKGROUND_GRADIENTS, BACKGROUND_OPTIONS, type BackgroundId } from '../lib/backgrounds'
import { CARD_BACK_GRADIENTS, CARD_BACK_OPTIONS, type CardBackId } from '../lib/cardBacks'

interface SettingsPanelProps {
  open: boolean
  cardBack: CardBackId
  onSelectCardBack: (id: CardBackId) => void
  background: BackgroundId
  onSelectBackground: (id: BackgroundId) => void
  onClose: () => void
}

/** A small preferences popover — card-back and table-background choice,
 * each saved to localStorage so it survives reloads and carries over
 * between games. */
export function SettingsPanel({
  open,
  cardBack,
  onSelectCardBack,
  background,
  onSelectBackground,
  onClose,
}: SettingsPanelProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[400] bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-label="Settings"
            className="fixed left-1/2 top-1/2 z-[401] max-h-[88vh] w-[min(340px,92vw)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-6"
            initial={{ opacity: 0, scale: 0.9, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 16 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          >
            <div className="flex flex-col gap-5">
              <SwatchGroup
                title="Card Back"
                options={CARD_BACK_OPTIONS}
                current={cardBack}
                onSelect={onSelectCardBack}
                swatchClass={(id) => CARD_BACK_GRADIENTS[id]}
              />
              <SwatchGroup
                title="Background"
                options={BACKGROUND_OPTIONS}
                current={background}
                onSelect={onSelectBackground}
                swatchClass={(id) => BACKGROUND_GRADIENTS[id]}
              />
            </div>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 w-full rounded-full bg-slate-100 py-2.5 text-sm font-semibold uppercase tracking-wide text-slate-700 transition-colors hover:bg-slate-200 active:scale-[0.98]"
            >
              Done
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

interface SwatchGroupProps<T extends string> {
  title: string
  options: ReadonlyArray<{ id: T; label: string }>
  current: T
  onSelect: (id: T) => void
  /** Tailwind gradient-stops string for the swatch preview of a given option. */
  swatchClass: (id: T) => string
}

/** One labelled grid of selectable gradient swatches — shared by every
 * appearance setting so they stay visually identical. */
function SwatchGroup<T extends string>({
  title,
  options,
  current,
  onSelect,
  swatchClass,
}: SwatchGroupProps<T>) {
  return (
    <section>
      <h3 className="mb-3 text-base font-bold uppercase tracking-wide text-slate-800 sm:text-lg">
        {title}
      </h3>
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onSelect(option.id)}
            className={`flex flex-col items-center gap-1.5 rounded-2xl p-2 transition-transform active:scale-95 ${
              current === option.id ? 'bg-slate-100 ring-2 ring-violet-500' : ''
            }`}
          >
            <span
              className={`h-14 w-10 rounded-[8px] bg-gradient-to-br shadow-inner sm:h-16 sm:w-11 ${swatchClass(option.id)}`}
            />
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-600 sm:text-[11px]">
              {option.label}
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}
