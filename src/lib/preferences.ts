import { DEFAULT_CARD_BACK, isCardBackId, type CardBackId } from './cardBacks'

const STORAGE_KEY = 'solitaire:preferences:cardBack'

type Listener = () => void
const listeners = new Set<Listener>()

function readStoredCardBack(): CardBackId {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return isCardBackId(stored) ? stored : DEFAULT_CARD_BACK
  } catch {
    // Storage can throw in private browsing or when disabled — fall back
    // to the default rather than letting preference reads crash the app.
    return DEFAULT_CARD_BACK
  }
}

let cached: CardBackId = typeof window === 'undefined' ? DEFAULT_CARD_BACK : readStoredCardBack()

export function getCardBack(): CardBackId {
  return cached
}

export function setCardBack(id: CardBackId): void {
  if (cached === id) return
  cached = id
  try {
    window.localStorage.setItem(STORAGE_KEY, id)
  } catch {
    // The in-memory preference still applies for the rest of this session
    // even if it can't be persisted.
  }
  listeners.forEach((listener) => listener())
}

export function subscribeCardBack(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

if (typeof window !== 'undefined') {
  // Keep other tabs/windows of the same install in sync.
  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY) return
    cached = isCardBackId(event.newValue) ? event.newValue : DEFAULT_CARD_BACK
    listeners.forEach((listener) => listener())
  })
}
