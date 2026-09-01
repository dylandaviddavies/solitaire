import { AnimatePresence, motion } from 'motion/react'
import { type ReactNode } from 'react'
import { useBackgroundPreference } from '../hooks/useBackgroundPreference'
import { useCardBackPreference } from '../hooks/useCardBackPreference'
import { usePreference } from '../hooks/usePreference'
import { BACKGROUND_GRADIENTS, BACKGROUND_OPTIONS } from '../lib/backgrounds'
import { CARD_BACK_OPTIONS } from '../lib/cardBacks'
import {
  backgroundPreference,
  cardBackPreference,
  motionPreference,
  soundPreference,
} from '../lib/preferences'
import { CardBack } from './CardBack'

interface SettingsPanelProps {
  open: boolean
  onClose: () => void
}

const MOTION_OPTIONS = [
  { id: 'system', label: 'System' },
  { id: 'full', label: 'Full' },
  { id: 'reduced', label: 'Reduced' },
] as const

/** A small preferences popover — appearance, sound and motion, all saved
 * to localStorage. Seeds live on the toolbar's `#seed` chip, not here. */
export function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const cardBack = useCardBackPreference()
  const background = useBackgroundPreference()
  const sound = usePreference(soundPreference)
  const motionLevel = usePreference(motionPreference)

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
                onSelect={cardBackPreference.set}
                renderSwatch={(id) => (
                  <span className="block h-14 w-10 sm:h-16 sm:w-11">
                    <CardBack variant={id} />
                  </span>
                )}
              />
              <SwatchGroup
                title="Background"
                options={BACKGROUND_OPTIONS}
                current={background}
                onSelect={backgroundPreference.set}
                renderSwatch={(id) => (
                  <span
                    className={`block h-14 w-10 rounded-[8px] bg-gradient-to-b shadow-inner sm:h-16 sm:w-11 ${BACKGROUND_GRADIENTS[id]}`}
                  />
                )}
              />
              <SegmentedRow
                title="Sound"
                options={[
                  { id: 'on', label: 'On' },
                  { id: 'off', label: 'Off' },
                ]}
                current={sound}
                onSelect={soundPreference.set}
              />
              <SegmentedRow
                title="Motion"
                options={MOTION_OPTIONS}
                current={motionLevel}
                onSelect={motionPreference.set}
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
  renderSwatch: (id: T) => ReactNode
}

/** One labelled grid of selectable swatches — shared by every appearance
 * setting so they stay visually identical. */
function SwatchGroup<T extends string>({
  title,
  options,
  current,
  onSelect,
  renderSwatch,
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
            {renderSwatch(option.id)}
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-600 sm:text-[11px]">
              {option.label}
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}

interface SegmentedRowProps<T extends string> {
  title: string
  options: ReadonlyArray<{ id: T; label: string }>
  current: T
  onSelect: (id: T) => void
}

/** A labelled segmented control for the on/off-ish settings. */
function SegmentedRow<T extends string>({ title, options, current, onSelect }: SegmentedRowProps<T>) {
  return (
    <section className="flex items-center justify-between gap-3">
      <h3 className="text-base font-bold uppercase tracking-wide text-slate-800 sm:text-lg">
        {title}
      </h3>
      <div className="flex overflow-hidden rounded-full bg-slate-100 p-0.5">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onSelect(option.id)}
            className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide transition-colors ${
              current === option.id ? 'bg-violet-500 text-white' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </section>
  )
}
