import { useEffect, useState } from 'react'

/**
 * Ticking whole seconds read from `getElapsedMs` (the engine's play clock).
 * Recomputed on every render — so a new game shows 0:00 the instant the
 * board re-renders — with a once-a-second re-render while `active` keeping
 * it ticking between moves. Once `active` is false the interval stops; the
 * engine has paused its clock by then, so the value is frozen anyway.
 */
export function useElapsedSeconds(getElapsedMs: () => number, active: boolean): number {
  const [, setTick] = useState(0)

  useEffect(() => {
    if (!active) return
    const id = window.setInterval(() => setTick((t) => t + 1), 1000)
    return () => window.clearInterval(id)
  }, [active])

  return Math.floor(getElapsedMs() / 1000)
}

export function formatClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}
