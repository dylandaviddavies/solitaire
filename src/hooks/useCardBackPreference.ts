import { useSyncExternalStore } from 'react'
import { DEFAULT_CARD_BACK } from '../lib/cardBacks'
import { getCardBack, subscribeCardBack } from '../lib/preferences'

/** The currently selected card-back design, reactive to changes made from
 * the settings panel or from another tab of the same install. */
export function useCardBackPreference() {
  return useSyncExternalStore(subscribeCardBack, getCardBack, () => DEFAULT_CARD_BACK)
}
