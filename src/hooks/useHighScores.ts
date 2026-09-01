import { useSyncExternalStore } from 'react'
import { highScores, type HighScores } from '../lib/highScores'

/** The recorded best games — general and per-seed — reactive to a new
 * best set here or in another tab. */
export function useHighScores(): HighScores {
  return useSyncExternalStore(highScores.subscribe, highScores.get, highScores.get)
}
