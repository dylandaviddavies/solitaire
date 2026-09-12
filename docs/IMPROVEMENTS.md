# Improvements

Ideas for making the game better, roughly ordered by value within each section. Items marked **(bug)** were found during a September 2026 code review and are worth fixing regardless of feature plans.

## Correctness

- **Game time is wall-clock, not play time.** `startedAt` persists across saves, so a game resumed the next day "took" 20 hours — and that time feeds the per-seed and overall high scores, which makes them incomparable. Track accumulated active play time in the snapshot (pause on `visibilitychange`/unload) instead of a start timestamp.
- **Reloading a finished game shows a bare won board.** The win overlay is transient React state; after a refresh the player gets a fully-stacked board with nothing to do but find New Game. Either clear the save on win or re-show a "You won this one" state on restore.

## Gameplay features

- **Draw-3 mode.** The classic harder variant. The engine is close: `DrawMove` becomes draw-N, the waste view fans up to 3, and only the top is liftable (already true). Needs a settings entry and a snapshot version bump.
- **Hint button.** `findAutoMoveDestination` already knows how to find a legal move; a hint is "run that for every liftable card and wiggle/glow the first hit". Costs little given the existing engine queries.
- **Win-rate statistics.** Games played / won / current streak / best streak, alongside the existing best-time scores. Same `localStorage` + `useSyncExternalStore` pattern as `highScores`.
- **Scoring (standard or Vegas).** Move-count and time already exist; classic Klondike scoring would slot into `GameEngine.run()` since every mutation is a typed `Move`.
- **Unwinnable-deal detection / "no more moves" nudge.** The greedy solver in the integration test proves the primitives exist; even a shallow "no legal move available" toast beats silent stuckness.
- **Undo on the win screen** ("I wanted to keep playing" is rare, but a Same Deal button exists — an undo that reopens the board would round it out).

## UX & accessibility

- **Keyboard play.** Cards are `div`s with pointer handlers only — no tab stops, no Enter/Space activation. Klondike maps well to keyboard (arrows between piles, Enter to auto-move). This is the largest accessibility gap.
- **ARIA/screen-reader pass.** Cards and piles expose no roles, names, or live announcements ("7 of hearts moved to foundation"). The toolbar buttons are fine; the board is invisible to AT.
- **`user-scalable=no` + `maximum-scale=1`** in `index.html` blocks pinch-zoom for low-vision players. iOS ignores it anyway; consider allowing zoom and relying on `touch-action: none` on the board only, rather than the whole page.
- **Reduced-motion coverage is good but the win confetti still animates** (`WinOverlay` doesn't consult the preference; only `MotionConfig` flattening applies). Verify it actually flattens under `reduced`, and skip the infinite confetti loop explicitly.
- **Hashed text seeds display as opaque numbers.** Typing `canada-day` deals a stable game, but the chip and share link show the hash — remembering and re-sharing the phrase would be friendlier (store the original text alongside the numeric seed).
- **Timer pause.** Auto-pause the clock when the tab is hidden (pairs with the play-time fix above).

## Code quality

- **Deduplicate the suit-glyph maps.** `Card.ts` already owns `SUIT_SYMBOL` (exposed as `card.symbol`), yet `CardFace` and `FoundationSlotView` each declare their own `SUIT_GLYPH`. Export the map from `Card.ts` (or use `card.symbol`) and delete the copies.
- **`Board.cardLayout` re-derives the column geometry** (`stride`, `colX`) that `columnStride`/`columnLeft` already compute a few lines up. Hoist one shared helper so the two can't drift.
- **Stray tuning constants outside `animation.ts`:** the auto-finish cadence (`78` ms in `Board.handleAutoComplete` vs the named `DEAL_STEP_MS = 45`), the drawn-flip buffer (`+ 50` in the `drawn` effect), the sway multiplier (`2.2` in `useCardDrag`), and the copied-flash duration (`1400` in `SeedMenu`). The project's own convention says these belong in `lib/animation.ts` with names.
- **Side effects during render in `useGameEngine`'s lazy init** (`saveGameSnapshot`, `history.replaceState`). Benign today (idempotent), but StrictMode runs them twice and it's the pattern oxlint is warning about — move them into a mount effect.
- **`useCardDrag` ignores `pointerId`,** so a second finger on the same card mid-drag feeds `onPointerMove`/`onPointerEnd` from a different pointer. Track the active pointer id and ignore others.
- **Delete the empty `_to_delete/` directory** at the repo root.

## Tooling & CI

- **CI never runs the tests.** `deploy.yml` builds and ships to Pages on every push to master; `npm test`, `npm run lint`, and the Playwright suite only run locally. Add a check job (lint + typecheck + vitest at minimum) that gates the deploy job.
- **A second e2e that exercises drag-and-drop.** The current spec covers resume + auto-finish + win; a `mouse.down/move/up` drag onto a tableau column would cover the riskiest UI path (drop registry + stage scale math).
- **Prettier or oxfmt config committed.** The style (no semicolons, single quotes) is consistent but only by discipline; a formatter config makes it enforceable.
