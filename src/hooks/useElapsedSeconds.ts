import { useEffect, useState } from 'react'

/** Ticking seconds-since-`startedAtMs`, frozen once `active` is false. */
export function useElapsedSeconds(startedAtMs: number, active: boolean): number {
  const [elapsed, setElapsed] = useState(() => Math.floor((Date.now() - startedAtMs) / 1000))

  useEffect(() => {
    setElapsed(Math.floor((Date.now() - startedAtMs) / 1000))
    if (!active) return
    const id = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAtMs) / 1000))
    }, 1000)
    return () => window.clearInterval(id)
  }, [startedAtMs, active])

  return elapsed
}

export function formatClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}
