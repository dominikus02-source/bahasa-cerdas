const CACHE = "bc-arena-v2"
const STATIC_CACHE = "bc-static-v1"

const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/logo.png",
]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE && k !== STATIC_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return

  const url = new URL(event.request.url)

  // Only cache static assets (images, fonts, etc), not HTML or API
  const isStatic = /\.(png|jpg|jpeg|gif|svg|ico|webp|woff2?|css|js)$/i.test(url.pathname)

  if (isStatic) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const fetched = fetch(event.request).then((res) => {
          if (res.ok) {
            const clone = res.clone()
            caches.open(STATIC_CACHE).then((cache) => cache.put(event.request, clone))
          }
          return res
        })
        return cached || fetched
      })
    )
    return
  }

  // For HTML pages and API calls — always fetch from network (no cache)
  event.respondWith(fetch(event.request).catch(() => caches.match("/")))
})
