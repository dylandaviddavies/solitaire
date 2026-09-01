import { useSyncExternalStore } from 'react'
import { motionPreference } from '../lib/preferences'
import { usePreference } from './usePreference'

const QUERY = '(prefers-reduced-motion: reduce)'

const subscribe = (onChange: () => void) => {
  const mql = window.matchMedia(QUERY)
  mql.addEventListener('change', onChange)
  return () => mql.removeEventListener('change', onChange)
}
const osPrefersReduced = () =>
  typeof window !== 'undefined' && window.matchMedia(QUERY).matches

/**
 * Whether animation should be pared back — springs become instant, the
 * card sway and squash are skipped, the win cascade doesn't run.
 * `system` follows the OS setting; `full` / `reduced` force it.
 */
export function useReducedMotion(): boolean {
  const setting = usePreference(motionPreference)
  const os = useSyncExternalStore(subscribe, osPrefersReduced, () => false)
  if (setting === 'reduced') return true
  if (setting === 'full') return false
  return os
}
