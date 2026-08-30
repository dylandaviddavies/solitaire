type Listener = () => void

export interface Preference<T extends string> {
  /** The current value — cheap synchronous read, safe to call in render. */
  get: () => T
  /** Persist a new value and notify subscribers. No-op if unchanged. */
  set: (value: T) => void
  /** Register a change listener; returns an unsubscribe function. */
  subscribe: (listener: Listener) => () => void
}

interface PreferenceConfig<T extends string> {
  /** localStorage key the value is persisted under. */
  storageKey: string
  /** Used before storage is read and whenever the stored value is missing or invalid. */
  fallback: T
  /** Narrows an arbitrary stored string to a valid value of this preference. */
  isValid: (value: string | null) => value is T
}

/**
 * A single string-valued user preference: cached in memory, persisted to
 * localStorage, and kept in sync across tabs of the same install.
 *
 * Reads never throw — storage failures (private browsing, storage
 * disabled) fall back to `fallback`, and a value set during such a
 * session still applies in memory even though it can't be persisted.
 */
export function createPreference<T extends string>({
  storageKey,
  fallback,
  isValid,
}: PreferenceConfig<T>): Preference<T> {
  const listeners = new Set<Listener>()
  const notify = () => listeners.forEach((listener) => listener())

  const readStored = (): T => {
    try {
      const stored = window.localStorage.getItem(storageKey)
      return isValid(stored) ? stored : fallback
    } catch {
      return fallback
    }
  }

  let cached: T = typeof window === 'undefined' ? fallback : readStored()

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (event) => {
      if (event.key !== storageKey) return
      cached = isValid(event.newValue) ? event.newValue : fallback
      notify()
    })
  }

  return {
    get: () => cached,
    set: (value: T) => {
      if (cached === value) return
      cached = value
      try {
        window.localStorage.setItem(storageKey, value)
      } catch {
        // In-memory value still applies for the rest of this session.
      }
      notify()
    },
    subscribe: (listener: Listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}
