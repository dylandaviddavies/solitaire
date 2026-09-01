/** The set of selectable table backgrounds — pure data, no rendering here,
 * so both the board and the preferences store can share it. */
export type BackgroundId =
  | 'table'
  | 'midnight'
  | 'felt'
  | 'ocean'
  | 'dusk'
  | 'charcoal'
  | 'ember'

/** The classic card-table green — the default. */
export const DEFAULT_BACKGROUND: BackgroundId = 'table'

/** Tailwind gradient stops applied (with `bg-gradient-to-b`) to the
 * full-height board container. */
export const BACKGROUND_GRADIENTS: Record<BackgroundId, string> = {
  table: 'from-[#15733f] via-[#0b5030] to-[#07331e]',
  midnight: 'from-slate-950 via-[#0b1224] to-[#111c3a]',
  felt: 'from-emerald-900 via-[#0c3b2e] to-emerald-950',
  ocean: 'from-sky-900 via-[#0b2a4a] to-slate-950',
  dusk: 'from-indigo-950 via-[#2a1e46] to-fuchsia-950',
  charcoal: 'from-neutral-800 via-neutral-900 to-black',
  ember: 'from-rose-950 via-[#3b0f1f] to-slate-950',
}

export const BACKGROUND_OPTIONS: ReadonlyArray<{ id: BackgroundId; label: string }> = [
  { id: 'table', label: 'Classic' },
  { id: 'midnight', label: 'Midnight' },
  { id: 'felt', label: 'Dark Felt' },
  { id: 'ocean', label: 'Ocean' },
  { id: 'dusk', label: 'Dusk' },
  { id: 'charcoal', label: 'Charcoal' },
  { id: 'ember', label: 'Ember' },
]

export function isBackgroundId(value: string | null): value is BackgroundId {
  return value !== null && Object.hasOwn(BACKGROUND_GRADIENTS, value)
}
