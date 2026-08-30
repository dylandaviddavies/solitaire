import { DEFAULT_BACKGROUND, isBackgroundId } from './backgrounds'
import { DEFAULT_CARD_BACK, isCardBackId } from './cardBacks'
import { createPreference } from './createPreference'

const STORAGE_PREFIX = 'solitaire:preferences:'

/** Selected card-back design, persisted and synced across tabs. */
export const cardBackPreference = createPreference({
  storageKey: `${STORAGE_PREFIX}cardBack`,
  fallback: DEFAULT_CARD_BACK,
  isValid: isCardBackId,
})

/** Selected table background, persisted and synced across tabs. */
export const backgroundPreference = createPreference({
  storageKey: `${STORAGE_PREFIX}background`,
  fallback: DEFAULT_BACKGROUND,
  isValid: isBackgroundId,
})
