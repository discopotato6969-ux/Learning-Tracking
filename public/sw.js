/* Only cache the generic offline page. Never cache private HTML, API data or RSC. */
const CACHE = "aditya-tracker-offline-v2"
self.addEventListener("install", event => { event.waitUntil(caches.open(CACHE).then(cache => cache.add("/offline.html")).then(() => self.skipWaiting())) })
self.addEventListener("activate", event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => (key.startsWith("day-by-day-") || key.startsWith("aditya-tracker-")) && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())) })
self.addEventListener("fetch", event => {
  if (event.request.mode === "navigate" && new URL(event.request.url).origin === self.location.origin) {
    event.respondWith(fetch(event.request).catch(() => caches.match("/offline.html")))
  }
})
self.addEventListener("push", event => {
  let payload = {}; try { payload = event.data?.json() || {} } catch { /* use safe fallback */ }
  event.waitUntil(self.registration.showNotification(payload.title || "Aditya | My personal Tracker", { body: payload.body || "Your checklist is ready.", icon: "/icon-192.png", badge: "/icon-192.png", tag: payload.tag || "morning", renotify: false, data: { url: "/today" } }))
})
self.addEventListener("notificationclick", event => {
  event.notification.close()
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async clients => {
    const client = clients.find(c => new URL(c.url).origin === self.location.origin)
    if (client) { await client.navigate("/today"); return client.focus() }
    return self.clients.openWindow("/today")
  }))
})
