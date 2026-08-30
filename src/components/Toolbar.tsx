import { motion } from 'motion/react'
import { useState } from 'react'
import { useBackgroundPreference } from '../hooks/useBackgroundPreference'
import { useCardBackPreference } from '../hooks/useCardBackPreference'
import { formatClock, useElapsedSeconds } from '../hooks/useElapsedSeconds'
import { backgroundPreference, cardBackPreference } from '../lib/preferences'
import { SettingsPanel } from './SettingsPanel'

interface ToolbarProps {
  movesCount: number
  startedAtMs: number
  won: boolean
  canUndo: boolean
  canAutoComplete: boolean
  onNewGame: () => void
  onUndo: () => void
  onAutoComplete: () => void
}

const buttonBase =
  'rounded-full px-3.5 py-2 text-xs font-semibold uppercase tracking-wide shadow-[0_4px_14px_rgba(0,0,0,0.28)] transition-all duration-150 active:translate-y-0 active:scale-95 active:shadow-[0_2px_8px_rgba(0,0,0,0.25)] sm:px-5 sm:py-2.5 sm:text-sm sm:hover:-translate-y-0.5 sm:hover:shadow-[0_6px_18px_rgba(0,0,0,0.32)]'

export function Toolbar({
  movesCount,
  startedAtMs,
  won,
  canUndo,
  canAutoComplete,
  onNewGame,
  onUndo,
  onAutoComplete,
}: ToolbarProps) {
  const elapsed = useElapsedSeconds(startedAtMs, !won)
  const cardBack = useCardBackPreference()
  const background = useBackgroundPreference()
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <>
      <div className="flex w-full max-w-[900px] flex-wrap items-center justify-between gap-2 px-3 py-3 text-white sm:gap-3 sm:px-4 sm:py-4">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="text-xl sm:text-2xl">🃏</span>
          <h1 className="text-lg font-bold uppercase tracking-wide drop-shadow-sm sm:text-2xl">Solitaire</h1>
        </div>

        <div className="flex items-center gap-2.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-sm sm:gap-4 sm:px-4 sm:py-1.5 sm:text-sm">
          <span>⏱ {formatClock(elapsed)}</span>
          <span>👣 {movesCount}</span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {canAutoComplete && (
            <motion.button
              type="button"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={onAutoComplete}
              className={`${buttonBase} bg-emerald-400 text-emerald-950`}
            >
              Auto Finish ✨
            </motion.button>
          )}
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            className={`${buttonBase} bg-white/90 text-slate-800 disabled:opacity-40`}
          >
            Undo ↺
          </button>
          <button
            type="button"
            onClick={onNewGame}
            className={`${buttonBase} bg-orange-400 text-orange-950`}
          >
            New Game
          </button>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            aria-label="Settings"
            className={`${buttonBase} bg-white/90 px-2.5 text-sm text-slate-800 sm:px-3 sm:text-base`}
          >
            ⚙️
          </button>
        </div>
      </div>

      <SettingsPanel
        open={settingsOpen}
        cardBack={cardBack}
        onSelectCardBack={cardBackPreference.set}
        background={background}
        onSelectBackground={backgroundPreference.set}
        onClose={() => setSettingsOpen(false)}
      />
    </>
  )
}
