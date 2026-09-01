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

export type SoundSetting = 'on' | 'off'
const isSoundSetting = (v: string | null): v is SoundSetting => v === 'on' || v === 'off'

/** Whether the synthesised sound effects play. */
export const soundPreference = createPreference<SoundSetting>({
  storageKey: `${STORAGE_PREFIX}sound`,
  fallback: 'on',
  isValid: isSoundSetting,
})

export type MotionSetting = 'system' | 'full' | 'reduced'
const isMotionSetting = (v: string | null): v is MotionSetting =>
  v === 'system' || v === 'full' || v === 'reduced'

/** Animation level. `system` follows the OS "reduce motion" setting; the
 * others override it. */
export const motionPreference = createPreference<MotionSetting>({
  storageKey: `${STORAGE_PREFIX}motion`,
  fallback: 'system',
  isValid: isMotionSetting,
})
