/**
 * Lotus Service Worker — App shell caching for offline support.
 *
 * Strategy: Cache-first for static assets, network-first for API/sync.
 * This ensures the app shell loads instantly even offline.
 */

const CACHE_NAME = "lotus-v1";
const STATIC_ASSETS = [
    "/",
    "/index.html",
    "/manifest.json",
    "/lotus-192.png",
    "/lotus-logo.png",
];

// Install: precache static shell
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
    );
    self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            )
        )
    );
    self.clients.claim();
});

// Fetch: cache-first for static, network-first for everything else
self.addEventListener("fetch", (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET and cross-origin
    if (request.method !== "GET" || url.origin !== self.location.origin) {
        return;
    }

    // Static assets: cache-first
    if (
        request.destination === "style" ||
        request.destination === "script" ||
        request.destination === "image" ||
        request.destination === "font" ||
        url.pathname.endsWith(".html") ||
        url.pathname === "/"
    ) {
        event.respondWith(
            caches.match(request).then((cached) => {
                const fetchPromise = fetch(request)
                    .then((response) => {
                        if (response.ok) {
                            const clone = response.clone();
                            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
                        }
                        return response;
                    })
                    .catch(() => cached);

                return cached || fetchPromise;
            })
        );
        return;
    }

    // Everything else: network-first
    event.respondWith(
        fetch(request).catch(() => caches.match(request))
    );
});
