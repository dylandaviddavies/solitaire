---
name: solitaire-dev
description: Use when reading or changing code in this Solitaire repo — the architecture map, hard rules (engine/UI separation, geometry, animation constants), commands, and testing patterns that changes must respect.
---

# Working in the Solitaire codebase

Klondike (draw-1) in React 19 + TypeScript + Tailwind v4 + Motion, built with Vite, deployed as a PWA to GitHub Pages under the base path `/solitaire/`.

## Commands

- `npm run dev` — Vite dev server (service worker enabled in dev too)
- `npm run build` — `tsc -b` then `vite build`; the tsc step is the typecheck gate
- `npm run lint` — oxlint (not eslint)
- `npm test` — Vitest, runs `src/**/*.test.ts` in plain Node (no jsdom; engine tests are framework-free)
- `npm run test:e2e` — Playwright; starts its own dev server on port 5173, tests hit `/solitaire/`

Run `npm test` and `npm run build` before considering any engine or lib change done.

## Architecture — the one rule that matters

`src/domain/` is a framework-agnostic OO model. **No React imports there, ever.** The dependency direction is strictly: components → hooks → domain.

- `GameEngine` is the single orchestrator: it owns the piles, the undo history (Command pattern), and a typed `EventEmitter` (`change`, `won`, `drawn`, `moved`, `invalidMove`).
- Every board mutation is a `Move` subclass with `execute()`/`undo()` (`src/domain/moves/`). Never mutate piles directly from the engine or UI — new mutations mean a new Move class pushed through `GameEngine.run()`.
- Pile rules live in `Pile` subclasses (`src/domain/piles/`) behind `canAccept`/`canLift`. A new pile type is a new subclass; existing piles and the engine shouldn't need edits.
- `useGameEngine` is the only React adapter, via `useSyncExternalStore` keyed on `engine.version` (bumped on every mutation — `movesCount` alone is not a valid snapshot because dealing doesn't change it).

## UI mutation protocol

Components never call engine mutators directly for moves — everything routes through `Board`'s `runMutation(apply)`. It diffs `cardLayout()` (computed board-space positions) before/after the mutation and publishes per-card entry vectors through `LastMoveContext`; `CardView` mounts offset by that vector and eases to zero. Bypassing `runMutation` means the cards teleport instead of gliding.

Related invariants:

- Card positions are **computed from constants, never measured from the DOM** — `lib/layout.ts` (sizes, gaps) and `lib/tableauLayout.ts` (fan offsets) are shared by rendering and animation so they can't drift apart.
- The board renders inside `ResponsiveStage`, which applies a uniform CSS `scale()`. Any code converting screen pixels (`clientX`, `getBoundingClientRect`) into board-space transforms must divide by `useStageScale()`.
- Cross-pile card motion is hand-driven motion values (`useCardDrag`), deliberately **not** Motion's `layout`/`layoutId` projection — that was tried and fought the pointer + scale. Don't reintroduce it.
- Pile views key `CardView` by `card.id` so a card that changes piles gets a fresh mount (its glide-in rides on mount). Waste/stock/foundation views also render the card *under* the top one so the pile never blanks a frame early.
- Drop targets are hit-tested through `DropRegistry` (registered by `PileSlot`), not DOM events on the piles.

## Conventions

- All animation timings/springs live in `lib/animation.ts`; all geometry in `lib/layout.ts`. No new magic numbers inline in components — add a named constant next to its family, with a comment saying what it's tuned for.
- Persisted user settings go through `createPreference` (`lib/preferences.ts`) + `usePreference` — don't touch `localStorage` directly. Storage keys are namespaced `solitaire:*`.
- If `GameSnapshot` changes shape, bump its `version`, update the shape-check in `lib/gameStorage.ts`, and decide the migration story (v1 saves were deliberately dropped). `GameEngine.restore` must keep refusing anything that doesn't account for exactly 52 distinct cards.
- Comment style: explain *why* and the constraint being honored, not what the line does. This codebase is unusually comment-dense on rationale — match it.
- Formatting: no semicolons, single quotes, trailing commas, 2-space indent.
- Sounds live in `lib/sound.ts`: sampled mp3s from Kenney's CC0 packs in `src/assets/sounds/` (loaded via `import.meta.glob`), with synthesised blips for the musical cues and as decode-time fallbacks. New audio must be mp3 (Safari can't decode ogg) and is precached via the mp3 entry in `vite.config.ts` globPatterns. Backgrounds/card backs are pure data modules consumed by both settings UI and renderers.

## Testing patterns

- Engine tests build boards via `GameEngine.testFixtures.ts` helpers (`emptySnapshot`, `card`, `withCompleteDeck`-style padding) and `engine.restore(snapshot)` — `restore` refuses anything that isn't a full 52-card deck, so fixtures must park unused cards in a spare column.
- The integration test drives a greedy solver over seeded deals; keep it passing for any rule change.
- The e2e test seeds `localStorage['solitaire:save']` via `page.addInitScript` before load — the same resume path production uses. No test hooks in production code; keep it that way.
- Determinism comes from `mulberry32(seed)` — the same seed always deals the same game. Use small literal seeds in tests.

## Deploy

Push to `master` → `.github/workflows/deploy.yml` builds and publishes to GitHub Pages. Note it does not run tests — verify locally first.
