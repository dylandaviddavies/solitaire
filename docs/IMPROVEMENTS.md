# Improvements

Ideas for making the game better, roughly ordered by value within each section. (The four bugs found in the September 2026 code review, a fifth found after — a second stock click tearing down the draw animation mid-flight — every item from the original Code Quality section, and the CI test gate and drag-and-drop e2e from Tooling & CI have since been fixed and removed from this list.)

## Correctness

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
- **Hashed text seeds display as opaque numbers.** Typing `canada-day` deals a stable game, but the chip and share link show the hash — remembering and re-sharing the phrase would be friendlier (store the original text alongside the numeric seed).

## Tooling & CI

- **Prettier or oxfmt config committed.** The style (no semicolons, single quotes) is consistent but only by discipline; a formatter config makes it enforceable.
