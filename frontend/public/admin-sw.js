/* Admin PWA service worker - scope: /admin/ */
const VERSION = "admin-v1";
const CACHE = `tb-admin-${VERSION}`;
const SHELL = ["/admin/", "/admin/reservas/", "/admin/properties/", "/offline.html", "/favicon.svg?v=5"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => Promise.allSettled(SHELL.map((u) => cache.add(u)))).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith("tb-admin-") && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // No cachear API ni escrituras
  if (url.pathname.includes("/api/")) return;

  const isAdminNav = req.mode === "navigate" && url.pathname.startsWith("/admin");
  if (isAdminNav) {
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(async () => (await caches.match(req)) || (await caches.match("/admin/")) || (await caches.match("/offline.html")) || Response.error())
    );
    return;
  }

  // Static assets: cache first
  if (/\.(?:css|js|png|jpe?g|svg|webp|avif|ico|woff2?|ttf|otf)$/i.test(url.pathname) || url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).then((res) => {
        const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {}); return res;
      }))
    );
  }
});
