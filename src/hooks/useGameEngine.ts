import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import { GameEngine } from '../domain/GameEngine'
import { loadGameSnapshot, saveGameSnapshot } from '../lib/gameStorage'
import { seedFromLocation, stripSeedFromLocation } from '../lib/seedLink'

/**
 * Adapts the framework-agnostic `GameEngine` to React via
 * `useSyncExternalStore`: the engine is the single source of truth, React
 * just re-renders whenever it announces a change. No game logic lives in
 * this hook or in any component — they only read the engine and call its
 * public methods.
 */
export function useGameEngine() {
  const engineRef = useRef<GameEngine | null>(null)
  if (!engineRef.current) {
    // A `?seed=` link deals that exact game. It wins over the saved game,
    // *unless* the player already has that same deal in progress — then we
    // resume it rather than restart their link.
    const urlSeed = seedFromLocation()
    const saved = loadGameSnapshot()
    const engine = new GameEngine(urlSeed ?? undefined)

    if (saved && (urlSeed === null || saved.seed === urlSeed)) {
      // Resume a game left in progress (e.g. the page was refreshed).
      // Restoring also carries over any still-queued deal-in steps, so an
      // interrupted deal animation picks up where it left off instead of
      // re-dealing from scratch or freezing half-dealt.
      engine.restore(saved)
    } else if (urlSeed !== null) {
      // Fresh deal of the shared seed — persist it now so a refresh before
      // the first move still lands here, not back on the previous save.
      saveGameSnapshot(engine.snapshot())
    }

    // Once the shared deal is loaded, take the param out of the address
    // bar so the player's own saved game drives any later refresh.
    if (urlSeed !== null) stripSeedFromLocation()
    engineRef.current = engine
  }
  const engine = engineRef.current

  const subscribe = useMemo(
    () => (onStoreChange: () => void) => engine.on('change', onStoreChange),
    [engine],
  )

  // The snapshot itself is just a version marker; components read live
  // pile contents straight off `engine` after re-rendering. It must
  // change on *every* mutation (including dealing, which doesn't move
  // `movesCount`) or useSyncExternalStore will skip the re-render.
  useSyncExternalStore(subscribe, () => engine.version)

  // Persist on every mutation — a move, a draw, an undo, even a single
  // dealt card — so a refresh at any point resumes from the most recent
  // state rather than losing whatever happened since the last save.
  useEffect(() => engine.on('change', () => saveGameSnapshot(engine.snapshot())), [engine])

  return engine
}
