/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { cleanupOutdatedCaches, precacheAndRoute, createHandlerBoundToURL } from "workbox-precaching";
import { registerRoute, NavigationRoute } from "workbox-routing";
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { CacheableResponsePlugin } from "workbox-cacheable-response";

cleanupOutdatedCaches();

// `self.__WB_MANIFEST` is injected at build time by vite-plugin-pwa (injectManifest).
precacheAndRoute(self.__WB_MANIFEST || []);

// SPA navigations: serve the app shell (index.html) from cache.
const navigationHandler = createHandlerBoundToURL("/index.html");
registerRoute(
  new NavigationRoute(navigationHandler, {
    denylist: [
      /^\/api\//,
      /\/assets\//,
      /\.(?:png|jpg|jpeg|webp|svg|gif|ico)$/i,
    ],
  })
);

// Cache images for fast back/forward and partial offline support.
registerRoute(
  ({ request }) => request.destination === "image",
  new CacheFirst({
    cacheName: "images",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 }),
    ],
  })
);

const resolveApiBaseUrl = () => {
  const envValue = String(
    import.meta.env.VITE_API_URL ||
      import.meta.env.VITE_API_BASE_URL ||
      import.meta.env.VITE_BACKEND_URL ||
      ""
  ).trim();

  // Keep SW config aligned with app fallback.
  if (envValue) return envValue;
  if (import.meta.env.DEV) return "http://localhost:5000/api";
  return "https://apnidukan-vlnw.onrender.com/api";
};

const getApiUrlParts = () => {
  const raw = resolveApiBaseUrl();
  if (!raw) return null;
  try {
    const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const url = new URL(withProtocol);
    const pathname = url.pathname.replace(/\/+$/, "");
    return {
      origin: url.origin,
      pathPrefix: pathname || "/api",
    };
  } catch {
    return null;
  }
};

// Cache CSS/JS/fonts with SWR.
registerRoute(
  ({ request }) =>
    request.destination === "style" ||
    request.destination === "script" ||
    request.destination === "font" ||
    request.destination === "worker",
  new StaleWhileRevalidate({
    cacheName: "static-resources",
    plugins: [new CacheableResponsePlugin({ statuses: [0, 200] })],
  })
);

// Best-effort caching for same-origin API GETs (helps “offline partially”).
registerRoute(
  ({ url, request }) => url.origin === self.location.origin && request.method === "GET" && url.pathname.startsWith("/api/"),
  new NetworkFirst({
    cacheName: "api",
    networkTimeoutSeconds: 4,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 10 }),
    ],
  })
);

// Best-effort caching for configured backend API (when it’s on a different origin).
const apiParts = getApiUrlParts();
if (apiParts && apiParts.origin) {
  registerRoute(
    ({ url, request }) =>
      request.method === "GET" &&
      url.origin === apiParts.origin &&
      (url.pathname === apiParts.pathPrefix || url.pathname.startsWith(`${apiParts.pathPrefix}/`)),
    new NetworkFirst({
      cacheName: "backend-api",
      networkTimeoutSeconds: 4,
      plugins: [
        new CacheableResponsePlugin({ statuses: [0, 200] }),
        new ExpirationPlugin({ maxEntries: 150, maxAgeSeconds: 60 * 10 }),
      ],
    })
  );
}

// Allow the app to trigger skipWaiting when an update is ready.
self.addEventListener("message", (event) => {
  if (event?.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
