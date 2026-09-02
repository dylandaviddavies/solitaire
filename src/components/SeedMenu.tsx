import { AnimatePresence, motion } from 'motion/react'
import { useRef, useState } from 'react'
import { parseSeed, randomSeed } from '../domain/rng'
import { formatClock } from '../hooks/useElapsedSeconds'
import { useHighScores } from '../hooks/useHighScores'
import { shareableSeedUrl } from '../lib/seedLink'

const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

interface SeedMenuProps {
  open: boolean
  seed: number
  /** Deal a specific seed (typed or randomised) and close the menu. */
  onPlaySeed: (seed: number) => void
  onClose: () => void
}

/**
 * The popover hung off the toolbar's `#seed` chip: share the current deal
 * (a `?seed=` link, or the raw number), see its best run, or deal another
 * seed (typed, pasted or rolled). This is the only place seeds are managed
 * now — deliberately out of the settings modal, which is for persistent
 * appearance/sound/motion prefs.
 */
export function SeedMenu({ open, seed, onPlaySeed, onClose }: SeedMenuProps) {
  const bests = useHighScores()
  const seedBest = bests.bySeed[String(seed)]
  const field = useRef<HTMLInputElement>(null)
  const [copiedNumber, setCopiedNumber] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  const play = () => {
    const parsed = parseSeed(field.current?.value ?? '')
    if (parsed !== null) onPlaySeed(parsed)
  }

  const flash = (set: (v: boolean) => void) => {
    set(true)
    window.setTimeout(() => set(false), 1400)
  }
  const copyNumber = () => {
    navigator.clipboard?.writeText(String(seed)).then(() => flash(setCopiedNumber), () => {})
  }
  const shareLink = () => {
    const url = shareableSeedUrl(seed)
    if (canShare) {
      navigator
        .share({ title: 'Klondike Solitaire', text: `Try this deal — seed #${seed}`, url })
        .catch(() => {})
      return
    }
    navigator.clipboard?.writeText(url).then(() => flash(setCopiedLink), () => {})
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Click-away catcher — transparent, just closes the menu. */}
          <div className="fixed inset-0 z-[390]" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-label="Deal seed"
            className="absolute right-0 top-[calc(100%+8px)] z-[400] w-64 rounded-2xl bg-white p-4 text-left text-slate-800 shadow-2xl"
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          >
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
              This deal
            </p>
            <div className="mt-1 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={copyNumber}
                title="Copy the seed number"
                className="font-mono text-lg font-bold tabular-nums text-slate-800 transition-colors hover:text-violet-600"
              >
                #{seed}
              </button>
              {copiedNumber && (
                <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600">
                  Number copied ✓
                </span>
              )}
            </div>
            {seedBest && (
              <p className="mt-1.5 text-xs text-slate-500">
                Best here: {formatClock(Math.floor(seedBest.elapsedMs / 1000))} · {seedBest.moves}{' '}
                moves
              </p>
            )}
            <button
              type="button"
              onClick={shareLink}
              className="mt-2.5 w-full rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-700 transition-colors hover:bg-slate-200 active:scale-95"
            >
              {copiedLink ? 'Link copied ✓' : canShare ? 'Share deal' : 'Copy link'}
            </button>

            <div className="my-3 h-px bg-slate-200" />

            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
              Play another
            </p>
            <div className="mt-1.5 flex gap-2">
              <input
                key={seed}
                ref={field}
                type="text"
                inputMode="numeric"
                defaultValue={String(seed)}
                onKeyDown={(e) => e.key === 'Enter' && play()}
                aria-label="Seed to deal"
                className="min-w-0 flex-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-700 outline-none focus:border-violet-400"
              />
              <button
                type="button"
                onClick={() => {
                  if (field.current) field.current.value = String(randomSeed())
                }}
                title="Roll a random seed"
                className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-200"
              >
                🎲
              </button>
            </div>
            <button
              type="button"
              onClick={play}
              className="mt-2 w-full rounded-full bg-violet-500 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition-colors hover:bg-violet-600 active:scale-95"
            >
              Deal It
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
