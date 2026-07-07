const CACHE_NAME = "ai-trainer-question-bank-v2026070701";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css?v=2026070701",
  "./vault.js?v=2026070701",
  "./app.js?v=2026070701",
  "./manifest.webmanifest?v=2026070701",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.pathname.includes("/ai-exam-simulator/")) {
    event.respondWith(fetch(event.request, { cache: "no-store" }));
    return;
  }
  const acceptsHTML = event.request.headers.get("accept")?.includes("text/html");
  if (event.request.mode === "navigate" || acceptsHTML) {
    event.respondWith(
      fetch(event.request, { cache: "no-store" })
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match("./index.html"))),
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request).then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
      );
    }),
  );
});
