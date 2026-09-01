import { AnimatePresence, motion } from 'motion/react'
import { formatClock } from '../hooks/useElapsedSeconds'
import type { Score } from '../lib/highScores'

interface WinOverlayProps {
  visible: boolean
  movesCount: number
  elapsedMs: number
  seed: number
  newGeneralBest: boolean
  newSeedBest: boolean
  bestOverall: Score | null
  bestThisSeed: Score | null
  onNewGame: () => void
  onRetrySeed: () => void
}

const CONFETTI_GLYPHS = ['♥', '♦', '♣', '♠']
const fmt = (s: Score) => `${formatClock(Math.floor(s.elapsedMs / 1000))} · ${s.moves} moves`

export function WinOverlay({
  visible,
  movesCount,
  elapsedMs,
  seed,
  newGeneralBest,
  newSeedBest,
  bestOverall,
  bestThisSeed,
  onNewGame,
  onRetrySeed,
}: WinOverlayProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[500] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {Array.from({ length: 24 }, (_, i) => (
            <motion.span
              key={i}
              className="pointer-events-none absolute text-3xl"
              style={{ left: `${(i * 37) % 100}%`, color: i % 2 === 0 ? '#fb7185' : '#fde68a' }}
              initial={{ y: -40, opacity: 0, rotate: 0 }}
              animate={{ y: '110vh', opacity: 1, rotate: 360 }}
              transition={{
                duration: 2.4 + (i % 5) * 0.3,
                repeat: Infinity,
                delay: (i % 6) * 0.25,
                ease: 'linear',
              }}
            >
              {CONFETTI_GLYPHS[i % CONFETTI_GLYPHS.length]}
            </motion.span>
          ))}

          <motion.div
            className="relative z-10 flex w-[min(340px,90vw)] flex-col items-center gap-4 rounded-3xl bg-white px-8 py-8 text-center shadow-2xl"
            initial={{ scale: 0.6, y: 40, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          >
            <motion.span
              className="text-6xl"
              animate={{ rotate: [0, -8, 8, -8, 0] }}
              transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 0.6 }}
            >
              🏆
            </motion.span>
            <h2 className="text-3xl font-bold uppercase tracking-wide text-slate-800">You Win!</h2>
            <p className="text-slate-500">
              Solved in <span className="font-bold text-slate-700">{movesCount}</span> moves and{' '}
              <span className="font-bold text-slate-700">
                {formatClock(Math.floor(elapsedMs / 1000))}
              </span>
            </p>

            <div className="w-full rounded-2xl bg-slate-50 p-3 text-sm">
              <ScoreRow
                label={`Best · seed ${seed}`}
                score={newSeedBest ? null : bestThisSeed}
                isNew={newSeedBest}
              />
              <div className="my-2 h-px bg-slate-200" />
              <ScoreRow
                label="Best · overall"
                score={newGeneralBest ? null : bestOverall}
                isNew={newGeneralBest}
              />
            </div>

            <div className="flex w-full gap-2">
              <button
                type="button"
                onClick={onRetrySeed}
                className="flex-1 rounded-full bg-slate-100 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-700 transition-colors hover:bg-slate-200 active:scale-[0.97]"
              >
                Same Deal
              </button>
              <button
                type="button"
                onClick={onNewGame}
                className="flex-1 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-white shadow-[0_4px_14px_rgba(0,0,0,0.28)] transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
              >
                New Deal
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function ScoreRow({ label, score, isNew }: { label: string; score: Score | null; isNew: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      {isNew ? (
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-emerald-700">
          New best!
        </span>
      ) : (
        <span className="font-semibold text-slate-700">{score ? fmt(score) : '—'}</span>
      )}
    </div>
  )
}
