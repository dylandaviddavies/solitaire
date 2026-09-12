import confetti from 'canvas-confetti'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef } from 'react'
import { formatClock } from '../hooks/useElapsedSeconds'
import type { Score } from '../lib/highScores'
import { useReducedMotionValue } from '../lib/MotionPrefContext'

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

const fmt = (s: Score) => `${formatClock(Math.floor(s.elapsedMs / 1000))} · ${s.moves} moves`

const CONFETTI_COLORS = ['#fb7185', '#fde68a', '#a78bfa', '#ffffff']
/** How often the gentle top-of-screen sprinkle re-fires while the overlay
 * is up, after the opening side cannons. */
const SPRINKLE_INTERVAL_MS = 900

/** Suit-glyph confetti shapes, so the celebration stays on card theme.
 * Built once, lazily — `shapeFromText` rasterises via a 2D canvas, and a
 * failure (an exotic browser) just falls back to the default shapes. */
let suitShapes: confetti.Shape[] | null = null
const getSuitShapes = (): confetti.Shape[] | undefined => {
  if (suitShapes === null) {
    try {
      suitShapes = ['♥', '♦', '♣', '♠'].map((text) =>
        confetti.shapeFromText({ text, scalar: 2 }),
      )
    } catch {
      suitShapes = []
    }
  }
  return suitShapes.length > 0 ? suitShapes : undefined
}

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
  const reduced = useReducedMotionValue()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // The celebration: two side cannons as the overlay lands, then a soft
  // sprinkle from the top for as long as it stays up. Drawn on a canvas
  // scoped to the overlay (not canvas-confetti's global one) so it sits
  // behind the stats card and vanishes with the overlay. Skipped entirely
  // under reduced motion — this canvas is outside Motion's reach, so
  // MotionConfig can't flatten it for us.
  useEffect(() => {
    if (!visible || reduced) return
    const canvas = canvasRef.current
    if (!canvas) return
    // No worker: a transferred OffscreenCanvas can't be handed over twice,
    // which breaks under StrictMode's double-invoked effects.
    const fire = confetti.create(canvas, { resize: true, useWorker: false })
    const shapes = getSuitShapes()

    const cannon = (angle: number, x: number) =>
      void fire({
        particleCount: 80,
        spread: 70,
        angle,
        origin: { x, y: 0.9 },
        startVelocity: 55,
        colors: CONFETTI_COLORS,
      })
    cannon(60, 0)
    cannon(120, 1)

    const sprinkle = window.setInterval(() => {
      void fire({
        particleCount: 14,
        spread: 120,
        startVelocity: 18,
        gravity: 0.7,
        scalar: 1.4,
        ticks: 240,
        origin: { x: Math.random(), y: -0.1 },
        colors: CONFETTI_COLORS,
        shapes,
      })
    }, SPRINKLE_INTERVAL_MS)

    return () => {
      window.clearInterval(sprinkle)
      fire.reset()
    }
  }, [visible, reduced])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[500] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />

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
