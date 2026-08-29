import { useMemo, useRef, useSyncExternalStore } from 'react'
import { GameEngine } from '../domain/GameEngine'

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
    engineRef.current = new GameEngine()
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

  return engine
}
