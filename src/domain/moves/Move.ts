/**
 * Command pattern: every state change to the board is expressed as a
 * `Move` object that knows how to apply itself and how to reverse itself.
 * `GameEngine` never mutates piles directly — it only ever asks a Move to
 * execute, and keeps executed moves on a stack so `undo()` is trivial and
 * uniform regardless of what kind of move it was.
 */
export interface Move {
  /** Short machine-readable label, handy for debugging/analytics. */
  readonly kind: string
  execute(): void
  undo(): void
}
