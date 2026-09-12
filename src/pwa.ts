import { registerSW } from 'virtual:pwa-register'

/**
 * Service-worker registration with active update polling.
 *
 * The browser only looks for a new service worker on a full navigation —
 * which an installed PWA almost never performs, so a deployed update
 * could sit unnoticed until a hard refresh (the "sticky old version"
 * problem). Instead we ask the server for a fresh worker on a timer and
 * whenever the app comes back into view. `registerType: 'autoUpdate'`
 * (vite.config.ts) does the rest: the new worker skips waiting, takes
 * control, and the page reloads itself — safe mid-game, because every
 * mutation is already persisted and the reload resumes exactly where the
 * player was.
 *
 * Update checks bypass the HTTP cache for the worker script itself, so
 * GitHub Pages' 10-minute cache headers don't delay them.
 */
const UPDATE_CHECK_INTERVAL_MS = 15 * 60 * 1000

registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return
    const check = () => {
      if (navigator.onLine) void registration.update().catch(() => {})
    }
    window.setInterval(check, UPDATE_CHECK_INTERVAL_MS)
    // An installed app is typically re-*focused*, not re-navigated —
    // returning to it is the natural moment to look for a new version.
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) check()
    })
  },
})
