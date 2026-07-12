// BahasaCerdas / Arena BC service worker
// Strategy: never cache HTML or API (avoids stale app shell / stale auth).
// Static assets → stale-while-revalidate. Navigations → network-first with an
// offline fallback page. Cross-origin (Supabase/Midtrans/etc.) is never touched.
const STATIC_CACHE = "bc-static-v3"
const OFFLINE_URL = "/offline.html"
const PRECACHE = ["/offline.html", "/manifest.json", "/icon-192.png"]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      // Resilient: a single failed asset must not abort the whole install.
      .then((cache) => Promise.allSettled(PRECACHE.map((u) => cache.add(u))))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== STATIC_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting()
})

self.addEventListener("fetch", (event) => {
  const req = event.request
  if (req.method !== "GET") return

  const url = new URL(req.url)
  // Only handle same-origin requests — leave Supabase/Midtrans/analytics alone.
  if (url.origin !== self.location.origin) return

  const isStatic = /\.(png|jpg|jpeg|gif|svg|ico|webp|woff2?|css|js|json)$/i.test(url.pathname)

  if (isStatic) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const fetched = fetch(req)
          .then((res) => {
            if (res.ok) {
              const clone = res.clone()
              caches.open(STATIC_CACHE).then((cache) => cache.put(req, clone))
            }
            return res
          })
          .catch(() => cached)
        return cached || fetched
      })
    )
    return
  }

  // HTML navigations: network-first, fall back to the offline page when offline.
  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match(OFFLINE_URL)))
    return
  }

  // Everything else (API, etc.): let the browser fetch from network normally.
})
