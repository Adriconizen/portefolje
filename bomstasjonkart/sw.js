const CACHE_NAME = "bomstasjonkart-v2";
const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./manifest.webmanifest",
  "./icons/icon.svg",
  "./icons/icon-maskable.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((navn) => Promise.all(navn.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return; // la kartfliser (OSM) og Leaflet-CDN gå rett til nett

  // stale-while-revalidate for hele app-skallet: vis cachet versjon med en gang
  // (fungerer offline), men hent alltid fersk versjon i bakgrunnen til neste besøk.
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request);
      const nettverk = fetch(event.request)
        .then((resp) => {
          if (resp.ok) cache.put(event.request, resp.clone());
          return resp;
        })
        .catch(() => cached);
      return cached ?? nettverk;
    }),
  );
});
