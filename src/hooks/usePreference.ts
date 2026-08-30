import { useSyncExternalStore } from 'react'
import type { Preference } from '../lib/createPreference'

/** Subscribes a component to a `createPreference` store, re-rendering when
 * the value changes here or in another tab of the same install. */
export function usePreference<T extends string>(preference: Preference<T>): T {
  return useSyncExternalStore(preference.subscribe, preference.get, preference.get)
}
