// BahasaCerdas / Arena BC service worker
// Strategy: never cache HTML or API (avoids stale app shell / stale auth).
// Static assets → stale-while-revalidate. Navigations → network-first with an
// offline fallback page. Cross-origin (Supabase/Midtrans/etc.) is never touched.
const STATIC_CACHE = "bc-static-v3"
const OFFLINE_URL = "/offline.html"
const PRECACHE = ["/offline.html", "/manifest.json", "/icon-192.png"]

// Terakhir kali halaman HTML gagal dimuat karena offline. Dipakai halaman
// offline untuk mengembalikan pengguna ke tempat dia tadi, bukan ke beranda.
self.__bc_pendingNav = null

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
  // Halaman offline meminta URL yang gagal dimuat untuk dikembalikan pengguna
  // ke sana setelah koneksi pulih.
  if (event.data === "GET_PENDING_NAV" && event.source && event.source.postMessage) {
    event.source.postMessage({ type: "PENDING_NAV", url: self.__bc_pendingNav || null })
  }
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
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) self.__bc_pendingNav = null
          return res
        })
        .catch(() => {
          const url = new URL(req.url)
          // Ingat ke mana pengguna sedang menuju supaya "Coba Lagi" mengembalikan
          // ke halaman itu, bukan ke beranda. Jangan rekam halaman offline sendiri.
          if (!url.pathname.includes("offline") && !url.pathname.startsWith("/_next/")) {
            self.__bc_pendingNav = req.url
          }
          return caches.match(OFFLINE_URL)
        })
    )
    return
  }

  // Everything else (API, etc.): let the browser fetch from network normally.
})

// ---------------------------------------------------------------------------
// Web Push
//
// In the Arena APK these surface as ordinary Android notifications — the TWA is
// Chrome, so the same handlers serve web and app.
// ---------------------------------------------------------------------------

self.addEventListener("push", (event) => {
  // A push with no payload is still worth showing: swallowing it silently would
  // spend the user's permission and give nothing back.
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data ? event.data.text() : "" }
  }

  const title = data.title || "BahasaCerdas"
  const options = {
    body: data.body || "Ada yang baru untukmu.",
    icon: "/arena-icon-192.png",
    badge: "/arena-icon-192.png",
    // Opening straight to the relevant screen is the whole point; without a URL
    // the notification lands the student on the home screen to hunt for it.
    data: { url: data.url || "/arena" },
    // Same tag replaces an unread notification instead of stacking a second one.
    tag: data.tag || "arena",
    renotify: false,
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const target = (event.notification.data && event.notification.data.url) || "/arena"

  // Reuse an open Arena window when there is one. Opening a second window each
  // time would leave a trail of duplicates behind the app.
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes("/arena") && "focus" in client) {
          client.navigate(target)
          return client.focus()
        }
      }
      return self.clients.openWindow(target)
    })
  )
})
