// Service worker de la app "ECMO a pie de cama".
// Sube la versión de CACHE_NAME cada vez que cambies los ficheros
// para que el móvil descargue la versión nueva.
const CACHE_NAME = "ecmo-pie-de-cama-v14";
const ASSETS = [
  "./",
  "index.html",
  "styles.css",
  "app.js",
  "manifest.json",
  "logo.jpg",
  "icon-192.png",
  "icon-512.png",
  "apple-touch-icon.png",
  "favicon-32.png",
];

// Solo las imágenes (cambian poco) se sirven caché-primero, para ahorrar
// datos. Todo lo demás (HTML/CSS/JS/JSON) va siempre red-primero: así una
// actualización se ve en cuanto hay conexión, en vez de quedar atascada en
// una copia vieja hasta que el navegador decida revisar el service worker.
const IMAGE_RE = /\.(png|jpg|jpeg|svg|gif|webp|ico)$/i;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  let isImage = false;
  try {
    isImage = IMAGE_RE.test(new URL(req.url).pathname);
  } catch (e) {
    isImage = false;
  }

  if (isImage) {
    // Caché primero, con red de respaldo si no está cacheada todavía.
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        });
      })
    );
    return;
  }

  // Red primero para todo lo demás (HTML, CSS, JS, manifest), con caída a
  // caché solo si no hay conexión.
  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req).then((res) => res || caches.match("index.html")))
  );
});
