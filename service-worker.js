/*
  English Materials service worker.
  Change CACHE_NAME (v4, v5, ...) every time you update the site,
  so installed apps drop the old files and load the new ones.
*/
const CACHE_NAME = "english-materials-v4";

const APP_SHELL = [
  "./",
  "./index.html",
  "./reader.html",
  "./manifest.json"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.all(
        APP_SHELL.map(url => cache.add(url).catch(() => {}))
      )
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);

  /* Only handle same-site GET requests. PDFs and fonts load straight from the network. */
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  /* Pages: network first, so updates appear right away. Cache is the offline fallback. */
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          return response;
        })
        .catch(() =>
          caches.match(request).then(hit => hit || caches.match("./index.html"))
        )
    );
    return;
  }

  /* Other files: serve from cache, refresh in the background. */
  event.respondWith(
    caches.match(request).then(hit => {
      const network = fetch(request)
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => hit);

      return hit || network;
    })
  );
});
