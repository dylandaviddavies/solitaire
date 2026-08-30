import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import { GameEngine } from '../domain/GameEngine'
import { loadGameSnapshot, saveGameSnapshot } from '../lib/gameStorage'

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
    const engine = new GameEngine()
    // Resume a game left in progress (e.g. the page was refreshed) rather
    // than the fresh one the constructor just dealt. Restoring also
    // carries over any still-queued deal-in steps, so an interrupted deal
    // animation picks up right where it left off instead of re-dealing
    // from scratch or freezing half-dealt.
    const saved = loadGameSnapshot()
    if (saved) engine.restore(saved)
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
