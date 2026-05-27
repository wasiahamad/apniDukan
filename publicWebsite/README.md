# Public Website

Public storefront (Vite + React + TypeScript).

## Local development

```sh
npm install
npm run dev
```

## PWA (Installable App)

This project is configured as a Progressive Web App (PWA):

- Manifest: `public/manifest.json`
- Service worker (Workbox via Vite PWA): `src/service-worker.js` → built to `dist/service-worker.js`
- Install banner: shown on mobile when install is available

### Test PWA locally

1) Build + run preview (recommended for PWA testing):

```sh
npm run build
npm run preview
```

2) Open the preview URL in Chrome/Edge.

3) Install:
- Android/Chrome: you should see the in-app “Install PublicDukan” banner or the browser install UI.
- iOS Safari: use Share → “Add to Home Screen” (iOS does not fire `beforeinstallprompt`).

4) Offline test:
- DevTools → Network → set to “Offline” → refresh.
- The app shell should still load; images/static assets are cached.

### Production requirements

- HTTPS is required for service workers, geolocation, and notifications.
- Ensure `Cache-Control` is not disabling service worker updates (default static hosting configs usually work).

### Offline + API caching notes

- The service worker precaches the app shell and caches images/static assets.
- It also best-effort caches backend **GET** requests for the API base resolved from `VITE_API_URL` (or the production fallback).
- If you change backend URL, rebuild so the SW picks up the new `VITE_API_URL`.

## Build / test

```sh
npm run build
npm test
```

## Environment variables

- `VITE_API_URL` (optional) — backend base URL. Example: `https://apnidukan-vlnw.onrender.com/api`.

### Optional (maps + notifications)

- `VITE_GOOGLE_MAPS_API_KEY` (optional) — improves reverse-geocoding and maps widgets.
- Firebase push (scaffolded): set `VITE_FIREBASE_*` values and add backend support if you want real push delivery.
