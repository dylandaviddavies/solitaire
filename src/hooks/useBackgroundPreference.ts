import { backgroundPreference } from '../lib/preferences'
import { usePreference } from './usePreference'

/** The currently selected table background, reactive to changes made from
 * the settings panel or from another tab of the same install. */
export const useBackgroundPreference = () => usePreference(backgroundPreference)
