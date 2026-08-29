# Solitaire

A web-based Klondike Solitaire (draw-1) built with React, TypeScript, Tailwind CSS, and [Motion](https://motion.dev) for floaty, physics-based animations. Cards are chunky and colorful, and face cards use a procedurally generated low-poly motif instead of illustrated art.

It's a full PWA: installable to a home screen or desktop, and fully playable offline once you've visited it once.

Live at: **https://dylandaviddavies.github.io/solitaire/**

## Running locally

```bash
npm install
npm run dev
```

Then open the printed local URL. `npm run build` produces a production build in `dist/`, and `npm run preview` serves that build locally.

## How to play

- **Drag** a card onto a valid pile, or **click** a card to select it and then **click** the pile you want to move it to.
- **Double-click** a card to send it straight to a foundation if it fits.
- Click the stock pile to draw a card; once it's empty, click it again to recycle the waste pile.
- **Undo** reverses the last action. **Auto Finish** appears once every card is face up and can safely be played out automatically.

## Offline support & installing

The app is a [PWA](https://web.dev/explore/progressive-web-apps) via [`vite-plugin-pwa`](https://vite-pwa-org.netlify.app/), which generates a Workbox service worker at build time. On your first visit, the browser precaches the entire app shell (HTML, JS, CSS, icons); after that, it keeps working with no network at all — refresh, close the tab, restart your router, doesn't matter. New deploys are picked up automatically in the background (`registerType: 'autoUpdate'`) the next time you open it online.

Because it has a web app manifest and service worker, browsers will also offer to **install** it as a standalone app:

- **Desktop Chrome/Edge**: an install icon appears in the address bar.
- **Android Chrome**: "Add to Home screen" / an automatic install prompt.
- **iOS Safari**: Share → "Add to Home Screen" (iOS doesn't support install prompts, but the manifest icons and standalone display mode still apply).

Note that the service worker only activates on a real HTTP(S) origin (e.g. `npm run preview`, or the deployed GitHub Pages site) — `vite dev` also registers one (`devOptions.enabled`) so you can sanity-check offline behavior locally too. To test it yourself: load the page once, then go offline (devtools → Network → Offline, or just disconnect) and reload.

## Architecture

The game logic is a framework-agnostic, object-oriented domain model under `src/domain/`, kept intentionally decoupled from React:

- **`Card`** — a single playing card; knows only its own rank, suit, and face-up state.
- **`Deck`** — builds and shuffles a standard 52-card deck.
- **`piles/`** — `Pile` is an abstract base class defining the contract every pile must satisfy (`canAccept`, `canLift`, etc.); `StockPile`, `WastePile`, `FoundationPile`, and `TableauPile` each implement their own rules. Adding a new pile type never requires touching existing ones (Open/Closed).
- **`moves/`** — a Command pattern: every board mutation (`DrawMove`, `RecycleMove`, `TransferMove`) knows how to `execute()` and `undo()` itself, which is what makes undo trivial and uniform.
- **`GameEngine`** — the single orchestrator. It depends only on the `Pile` and `Move` abstractions (Dependency Inversion), holds the undo history, and emits events through a small typed `EventEmitter` rather than importing React.
- **`useGameEngine`** — the only place that adapts the engine to React, via `useSyncExternalStore`.

UI components (`src/components/`) are presentation-only: they read live state off the engine and call its public methods, using [Motion](https://motion.dev)'s `layoutId` shared-layout transitions so cards animate smoothly between piles regardless of where they're drawn from or dropped.

## Deploying to GitHub Pages

This repo is already configured for it:

- `vite.config.ts` sets `base: '/solitaire/'` to match `https://dylandaviddavies.github.io/solitaire/`.
- `.github/workflows/deploy.yml` builds the app and publishes `dist/` via GitHub Actions on every push to `main`.

One-time setup after pushing this repo to GitHub as `dylandaviddavies/solitaire`:

1. Go to the repo's **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. Push (or re-run the workflow from the **Actions** tab) — the site will be live at `https://dylandaviddavies.github.io/solitaire/` a minute or two later.
