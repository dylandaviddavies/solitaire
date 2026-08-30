import { cardBackPreference } from '../lib/preferences'
import { usePreference } from './usePreference'

/** The currently selected card-back design, reactive to changes made from
 * the settings panel or from another tab of the same install. */
export const useCardBackPreference = () => usePreference(cardBackPreference)
