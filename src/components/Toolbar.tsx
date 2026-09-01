import { motion } from 'motion/react'
import { useState } from 'react'
import { formatClock, useElapsedSeconds } from '../hooks/useElapsedSeconds'
import { SettingsPanel } from './SettingsPanel'

interface ToolbarProps {
  movesCount: number
  startedAtMs: number
  seed: number
  won: boolean
  canUndo: boolean
  canAutoComplete: boolean
  /** Squeeze everything down a size — used when vertical space is scarce
   * (a landscape phone), where the roomy bar would eat the board. */
  dense: boolean
  /** Start a game; a seed replays that exact deal, omit it for a random one. */
  onNewGame: (seed?: number) => void
  onUndo: () => void
  onAutoComplete: () => void
}

const buttonCommon =
  'rounded-full font-semibold uppercase shadow-[0_4px_14px_rgba(0,0,0,0.28)] transition-all duration-150 active:translate-y-0 active:scale-95 active:shadow-[0_2px_8px_rgba(0,0,0,0.25)]'
const buttonRoomy = `${buttonCommon} tracking-wide px-3.5 py-2 text-xs sm:px-5 sm:py-2.5 sm:text-sm sm:hover:-translate-y-0.5 sm:hover:shadow-[0_6px_18px_rgba(0,0,0,0.32)]`
const buttonDense = `${buttonCommon} px-2.5 py-1 text-[11px]`

export function Toolbar({
  movesCount,
  startedAtMs,
  seed,
  won,
  canUndo,
  canAutoComplete,
  dense,
  onNewGame,
  onUndo,
  onAutoComplete,
}: ToolbarProps) {
  const elapsed = useElapsedSeconds(startedAtMs, !won)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const copySeed = () => {
    navigator.clipboard?.writeText(String(seed)).then(
      () => {
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1200)
      },
      () => {},
    )
  }

  const button = dense ? buttonDense : buttonRoomy

  return (
    <>
      <div
        className={`flex w-full max-w-[900px] flex-wrap items-center justify-between text-white ${
          dense ? 'gap-1.5 px-3 py-1.5' : 'gap-2 px-3 py-3 sm:gap-3 sm:px-4 sm:py-4'
        }`}
      >
        <div className={`flex items-center ${dense ? 'gap-1.5' : 'gap-1.5 sm:gap-2'}`}>
          <span className={dense ? 'text-lg' : 'text-xl sm:text-2xl'}>🃏</span>
          <h1
            className={`font-bold uppercase tracking-wide drop-shadow-sm ${
              dense ? 'sr-only' : 'text-lg sm:text-2xl'
            }`}
          >
            Solitaire
          </h1>
        </div>

        <div className={`flex items-center ${dense ? 'gap-1.5' : 'gap-2'}`}>
          <div
            className={`flex items-center rounded-full bg-white/15 font-semibold backdrop-blur-sm ${
              dense
                ? 'gap-2 px-2.5 py-0.5 text-[11px]'
                : 'gap-2.5 px-3 py-1 text-xs sm:gap-4 sm:px-4 sm:py-1.5 sm:text-sm'
            }`}
          >
            <span>⏱ {formatClock(elapsed)}</span>
            <span>👣 {movesCount}</span>
          </div>
          {!dense && (
            <button
              type="button"
              onClick={copySeed}
              title="Copy seed"
              className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-sm transition-colors hover:bg-white/25 sm:py-1.5"
            >
              {copied ? 'copied!' : `#${seed}`}
            </button>
          )}
        </div>

        <div className={`flex items-center ${dense ? 'gap-1.5' : 'gap-1.5 sm:gap-2'}`}>
          {canAutoComplete && (
            <motion.button
              type="button"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={onAutoComplete}
              className={`${button} bg-emerald-400 text-emerald-950`}
            >
              Auto Finish ✨
            </motion.button>
          )}
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            className={`${button} bg-white/90 text-slate-800 disabled:opacity-40`}
          >
            Undo ↺
          </button>
          <button
            type="button"
            onClick={() => onNewGame()}
            className={`${button} bg-orange-400 text-orange-950`}
          >
            New Game
          </button>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            aria-label="Settings"
            className={`${button} bg-white/90 text-slate-800 ${
              dense ? 'px-2 text-sm' : 'px-2.5 text-sm sm:px-3 sm:text-base'
            }`}
          >
            ⚙️
          </button>
        </div>
      </div>

      <SettingsPanel
        open={settingsOpen}
        seed={seed}
        onPlaySeed={(s) => {
          onNewGame(s)
          setSettingsOpen(false)
        }}
        onClose={() => setSettingsOpen(false)}
      />
    </>
  )
}
