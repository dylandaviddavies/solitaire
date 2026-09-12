import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import { GameEngine } from '../domain/GameEngine'
import { loadGameSnapshot, saveGameSnapshot } from '../lib/gameStorage'
import { seedFromLocation, stripSeedFromLocation } from '../lib/seedLink'

/** What `useGameEngine`'s lazy init decided, beyond the engine itself —
 * carried out of that (side-effect-free) block so the mount effect below
 * knows what external state it still needs to sync (localStorage, the
 * URL) without redoing the URL/storage reads. */
interface InitResult {
  engine: GameEngine
  urlSeed: number | null
  /** True for a brand-new deal of a shared `?seed=` link — the one case
   * that needs an eager save (see the mount effect). */
  freshFromUrlSeed: boolean
}

/**
 * Adapts the framework-agnostic `GameEngine` to React via
 * `useSyncExternalStore`: the engine is the single source of truth, React
 * just re-renders whenever it announces a change. No game logic lives in
 * this hook or in any component — they only read the engine and call its
 * public methods.
 */
export function useGameEngine() {
  const initRef = useRef<InitResult | null>(null)
  if (!initRef.current) {
    // A `?seed=` link deals that exact game. It wins over the saved game,
    // *unless* the player already has that same deal in progress — then we
    // resume it rather than restart their link.
    const urlSeed = seedFromLocation()
    const saved = loadGameSnapshot()
    const engine = new GameEngine(urlSeed ?? undefined)
    let freshFromUrlSeed = false

    if (saved && (urlSeed === null || saved.seed === urlSeed)) {
      // Resume a game left in progress (e.g. the page was refreshed).
      // Restoring also carries over any still-queued deal-in steps, so an
      // interrupted deal animation picks up where it left off instead of
      // re-dealing from scratch or freezing half-dealt.
      engine.restore(saved)
    } else if (urlSeed !== null) {
      freshFromUrlSeed = true
    }

    initRef.current = { engine, urlSeed, freshFromUrlSeed }
  }
  const { engine, urlSeed, freshFromUrlSeed } = initRef.current

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

  // Syncs external state (storage, the address bar) with what the lazy
  // init above decided, exactly once per real mount. Kept out of that
  // block — which only ever constructs/restores the engine — so render
  // stays free of side effects; both calls are also idempotent (a
  // duplicate save writes the same bytes, and stripping an already-gone
  // `?seed=` is a no-op), so StrictMode's double-invoked mount is harmless.
  useEffect(() => {
    if (freshFromUrlSeed) {
      // Fresh deal of the shared seed — persist it now so a refresh before
      // the first move still lands here, not back on the previous save.
      saveGameSnapshot(engine.snapshot())
    }
    // Once the shared deal is loaded, take the param out of the address
    // bar so the player's own saved game drives any later refresh.
    if (urlSeed !== null) stripSeedFromLocation()
    // Mount-only: `engine`/`urlSeed`/`freshFromUrlSeed` are fixed for the
    // life of this hook instance (decided once by the lazy init above), so
    // there's nothing to react to on a later change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // The play clock only runs while the game is actually in front of the
  // player: pause it when the tab is hidden (and save, so the banked time
  // survives the tab being closed from the background) and resume it when
  // the tab comes back.
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden) {
        engine.pauseClock()
        saveGameSnapshot(engine.snapshot())
      } else {
        engine.resumeClock()
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [engine])

  return engine
}
