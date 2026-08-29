import { AnimatePresence, motion } from 'motion/react'
import { formatClock } from '../hooks/useElapsedSeconds'

interface WinOverlayProps {
  visible: boolean
  movesCount: number
  elapsedMs: number
  onNewGame: () => void
}

const CONFETTI_GLYPHS = ['♥', '♦', '♣', '♠']

export function WinOverlay({ visible, movesCount, elapsedMs, onNewGame }: WinOverlayProps) {
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
            className="relative z-10 flex flex-col items-center gap-4 rounded-3xl bg-white px-10 py-8 text-center shadow-2xl"
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
            <h2 className="text-3xl font-black text-slate-800">You Win!</h2>
            <p className="text-slate-500">
              Solved in <span className="font-bold text-slate-700">{movesCount}</span> moves and{' '}
              <span className="font-bold text-slate-700">{formatClock(Math.floor(elapsedMs / 1000))}</span>
            </p>
            <button
              type="button"
              onClick={onNewGame}
              className="rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 px-6 py-2.5 font-bold text-white shadow-[0_4px_0_rgba(0,0,0,0.25)] active:translate-y-[2px] active:shadow-none"
            >
              Play Again
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
