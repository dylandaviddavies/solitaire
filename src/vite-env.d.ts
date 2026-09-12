/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

/** Short git sha this build was made from, injected by vite.config.ts —
 * shown in the settings panel so an installed PWA can be checked against
 * the latest deploy. */
declare const __BUILD_ID__: string
