import type { Rank, Suit } from '../domain/Card'
import type { GameSnapshot, SerializedCard } from '../domain/GameEngine'

const STORAGE_KEY = 'solitaire:save'

function isSerializedCard(value: unknown): value is SerializedCard {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return typeof v.suit === 'string' && typeof v.rank === 'string' && typeof v.faceUp === 'boolean'
}

function isCardArray(value: unknown): value is SerializedCard[] {
  return Array.isArray(value) && value.every(isSerializedCard)
}

function isDealStepArray(value: unknown): value is GameSnapshot['dealQueue'] {
  return (
    Array.isArray(value) &&
    value.every(
      (s) => s && typeof s === 'object' && typeof (s as { column: unknown }).column === 'number' && typeof (s as { faceUp: unknown }).faceUp === 'boolean',
    )
  )
}

/** Shape-checks a value parsed from storage before trusting it as a
 * `GameSnapshot` — a corrupted or hand-edited save should fall back to a
 * fresh game rather than crash or hand `GameEngine.restore` garbage. */
function isGameSnapshot(value: unknown): value is GameSnapshot {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  // v1 saves (pre-seeds) don't shape-check here; they simply fall back to
  // a fresh game on the next load, which is a fine one-time trade.
  if (v.version !== 2) return false
  if (typeof v.seed !== 'number') return false
  if (!isCardArray(v.stock) || !isCardArray(v.waste)) return false
  if (!Array.isArray(v.foundations) || !v.foundations.every(isCardArray)) return false
  if (!Array.isArray(v.tableau) || !v.tableau.every(isCardArray)) return false
  if (!isDealStepArray(v.dealQueue)) return false
  return typeof v.movesMade === 'number' && typeof v.startedAt === 'number'
}

/** Reads a previously-saved game, or `null` if there isn't one (first
 * visit, storage disabled/unavailable, or a save that doesn't parse or
 * shape-check). */
export function loadGameSnapshot(): GameSnapshot | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return isGameSnapshot(parsed) ? parsed : null
  } catch {
    return null
  }
}

/** Best-effort save: if storage is full, disabled, or throws for any
 * other reason, this session's progress just won't survive a refresh —
 * not worth surfacing to the player mid-game. */
export function saveGameSnapshot(snapshot: GameSnapshot): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
  } catch {
    // ignore
  }
}

export function clearGameSnapshot(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

// Re-exported purely so consumers of this module can name the card shape
// without reaching into the domain layer themselves.
export type { GameSnapshot, SerializedCard, Rank, Suit }
