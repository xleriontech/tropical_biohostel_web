/* eslint-disable no-undef */
/**
 * Service worker de Tropical Biohostel.
 *
 * Estrategias:
 *  - Navegaciones: red primero (con respaldo en caché) y /offline.html como
 *    último recurso cuando no hay red.
 *  - Estáticos (fotos, iconos, _next/static): caché primero.
 *  - API (solo GET): red primero con respaldo en caché, para poder consultar
 *    fichas ya vistas sin conexión.
 *  - Las escrituras (reservas, chat, panel admin) NUNCA se cachean: el service
 *    worker no interfiere con ellas.
 *
 * Para publicar un cambio hay que subir la versión (VERSION): el activate
 * borra las cachés de versiones anteriores.
 */

const VERSION = "v4";
const CACHE_SHELL = `tb-shell-${VERSION}`;
const CACHE_ESTATICOS = `tb-estaticos-${VERSION}`;
const CACHE_PAGINAS = `tb-paginas-${VERSION}`;
const CACHE_API = `tb-api-${VERSION}`;

const SHELL = [
  "/",
  "/offline",
  "/offline.html",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-192.png",
  "/icons/icon-maskable-512.png",
  "/icons/apple-touch-icon-180.png",
  "/favicon.svg",
  "/tropical-logo.svg",
];

const esEstatico = (url) =>
  url.pathname.startsWith("/_next/static/") ||
  url.pathname.startsWith("/icons/") ||
  url.pathname.startsWith("/fotos/") ||
  url.pathname.startsWith("/tropical/") ||
  /\.(?:css|js|png|jpe?g|svg|webp|avif|ico|woff2?|ttf|otf|pdf)$/i.test(url.pathname);

// El service worker NUNCA se cachea a sí mismo: si lo hiciera, el navegador
// seguiría sirviendo la versión antigua y las actualizaciones no llegarían.
const esElPropioSw = (url) =>
  url.pathname === "/sw.js" || url.pathname.endsWith("/sw.js");

const esApi = (url) => url.pathname.includes("/api/");

/* ---------------------------------------------------------------- install */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_SHELL)
      // addAll falla entero si un recurso falla; se tolerate para no dejar
      // el service worker sin instalar.
      .then((cache) =>
        Promise.all(
          SHELL.map((url) =>
            cache.add(url).catch(() => {
              /* recurso no disponible ahora: se seguirá pidiendo por red */
            })
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

/* --------------------------------------------------------------- activate */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((claves) =>
        Promise.all(
          claves.filter((c) => !c.endsWith(`-${VERSION}`)).map((c) => caches.delete(c))
        )
      )
      .then(() => self.clients.claim())
  );
});

/* ------------------------------------------------------------- estrategias */
/**
 * Respaldo cuando no hay red.
 *
 * Ojo: una caída de red no siempre lanza una excepción. Un proxy, un CDN o
 * un portal cautivo pueden devolver un 502/503/504 "correcto". Por eso se
 * comprueba tanto el error de red como el status de la respuesta.
 */
async function respaldo(request, respuestaAlternativa) {
  const paginas = await caches.open(CACHE_PAGINAS);
  const guardada = await paginas.match(request);
  if (guardada) return guardada;

  const shell = await caches.open(CACHE_SHELL);
  const portada = await shell.match("/");
  if (portada) return portada;

  const offline = await shell.match("/offline.html");
  if (offline) return offline;

  // Último recurso: HTML mínimo generado en el propio service worker.
  if (!respuestaAlternativa) {
    return new Response(
      "<!doctype html><html lang='es'><meta charset='utf-8'>" +
        "<meta name='viewport' content='width=device-width,initial-scale=1'>" +
        "<title>Sin conexión · Tropical Biohostel</title>" +
        "<body style='font-family:system-ui,sans-serif;background:#f5efe0;color:#2b2119;" +
        "text-align:center;padding:3rem 1.5rem'>" +
        "<img src='/icons/icon-192.png' alt='' width='92' height='92' style='border-radius:16px'>" +
        "<h1 style='font-size:1.6rem'>Estás sin conexión</h1>" +
        "<p style='color:#6b5d4c'>Inténtalo de nuevo cuando vuelvas a tener internet.</p>" +
        "<a href='/' style='display:inline-block;margin-top:1rem;padding:.7rem 1.5rem;" +
        "border-radius:999px;background:#007a33;color:#fff;text-decoration:none;font-weight:600'>" +
        "Ir al inicio</a></body></html>",
      { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  return respuestaAlternativa || Response.error();
}

async function navegacion(request) {
  let respuesta = null;
  try {
    // cache: "no-store" fuerza a pedir la página real al servidor. Sin esto, el
    // navegador puede responder con su copia de la caché HTTP y el usuario
    // vería precios y textos desactualizados tras un despliegue. La copia
    // offline la guarda este mismo service worker.
    respuesta = await fetch(request, { cache: "no-store" });
  } catch {
    // Sin conexión: se sirve el respaldo.
  }

  if (respuesta && respuesta.ok) {
    const cache = await caches.open(CACHE_PAGINAS);
    cache.put(request, respuesta.clone());
    return respuesta;
  }

  // 404 real del sitio (p. ej. /pagina-inexistente) con red disponible:
  // se respeta y no se enmascara con la portada.
  if (respuesta && respuesta.status === 404) return respuesta;

  return respaldo(request, respuesta);
}

async function cachePrimero(request, nombreCache) {
  const cache = await caches.open(nombreCache);
  const guardada = await cache.match(request);
  if (guardada) return guardada;
  try {
    const respuesta = await fetch(request);
    if (respuesta && respuesta.ok) cache.put(request, respuesta.clone());
    return respuesta;
  } catch {
    return Response.error();
  }
}

async function redPrimero(request, nombreCache) {
  let respuesta = null;
  try {
    // Igual que en navegaciones: siempre se consulta la red para no servir
    // datos viejos (precios, disponibilidad) desde la caché del navegador.
    respuesta = await fetch(request, { cache: "no-store" });
  } catch {
    // Sin conexión: se sirve el respaldo.
  }

  if (respuesta && (respuesta.ok || respuesta.type === "opaque")) {
    const cache = await caches.open(nombreCache);
    cache.put(request, respuesta.clone());
    return respuesta;
  }

  // Error del servidor (5xx) o red caída: se intenta la copia en caché.
  const cache = await caches.open(nombreCache);
  const guardada = await cache.match(request);
  if (guardada) return guardada;

  if (respuesta) return respuesta;

  return new Response(
    JSON.stringify({ error: "Sin conexión", offline: true }),
    { status: 503, headers: { "Content-Type": "application/json; charset=utf-8" } }
  );
}

/* ------------------------------------------------------------------ fetch */
self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Solo GET: no se interfiere con reservas, chat ni administración.
  if (request.method !== "GET") return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }
  if (!url.protocol.startsWith("http")) return;

  if (request.mode === "navigate") {
    event.respondWith(navegacion(request));
    return;
  }

  if (esApi(url)) {
    event.respondWith(redPrimero(request, CACHE_API));
    return;
  }

  // El propio service worker: siempre desde la red, nunca desde caché.
  if (esElPropioSw(url)) return;

  // Recursos de terceros (imágenes remotas de R2, Unsplash…) no se cachean:
  // quedan bajo el control de su propio CDN.
  if (url.origin !== self.location.origin) return;

  if (esEstatico(url)) {
    event.respondWith(cachePrimero(request, CACHE_ESTATICOS));
  }
});

/* --------------------------------------------------------------- mensajes */
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
