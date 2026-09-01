/** The set of selectable card-back designs — pure data, no rendering here,
 * so both the visual component and the preferences store can share it.
 * `classic` is the traditional bordered red back (its own design in
 * `CardBack`); every other id is a geometric grid tinted by its gradient. */
export type CardBackId = 'classic' | 'violet' | 'ocean' | 'sunset' | 'forest' | 'midnight'

export type GeometricCardBackId = Exclude<CardBackId, 'classic'>

export const DEFAULT_CARD_BACK: CardBackId = 'classic'

export const CARD_BACK_GRADIENTS: Record<GeometricCardBackId, string> = {
  violet: 'from-violet-600 via-purple-600 to-fuchsia-700',
  ocean: 'from-cyan-500 via-blue-600 to-indigo-700',
  sunset: 'from-orange-500 via-rose-500 to-pink-600',
  forest: 'from-emerald-500 via-teal-600 to-cyan-700',
  midnight: 'from-slate-600 via-indigo-800 to-slate-950',
}

export const CARD_BACK_OPTIONS: ReadonlyArray<{ id: CardBackId; label: string }> = [
  { id: 'classic', label: 'Classic' },
  { id: 'violet', label: 'Violet' },
  { id: 'ocean', label: 'Ocean' },
  { id: 'sunset', label: 'Sunset' },
  { id: 'forest', label: 'Forest' },
  { id: 'midnight', label: 'Midnight' },
]

export function isCardBackId(value: string | null): value is CardBackId {
  return value === 'classic' || (value !== null && Object.hasOwn(CARD_BACK_GRADIENTS, value))
}
