import { motion } from 'motion/react'
import { formatClock, useElapsedSeconds } from '../hooks/useElapsedSeconds'

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
  'rounded-full px-4 py-2 text-sm font-bold shadow-[0_4px_0_rgba(0,0,0,0.25)] active:translate-y-[2px] active:shadow-none transition-transform'

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

  return (
    <div className="flex w-full max-w-[900px] flex-wrap items-center justify-between gap-3 px-4 py-4 text-white">
      <div className="flex items-center gap-2">
        <span className="text-2xl">🃏</span>
        <h1 className="text-2xl font-black tracking-tight drop-shadow-sm">Solitaire</h1>
      </div>

      <div className="flex items-center gap-4 rounded-full bg-white/15 px-4 py-1.5 text-sm font-semibold backdrop-blur-sm">
        <span>⏱ {formatClock(elapsed)}</span>
        <span>👣 {movesCount}</span>
      </div>

      <div className="flex items-center gap-2">
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
      </div>
    </div>
  )
}
