// Burn Log offline cache. Version changes whenever any shipped file changes.
const CACHE = "burnlog-f7d652b99e";
const SHELL = ["./","index.html","config.js","manifest.webmanifest","vendor/fonts.css","vendor/supabase.js","vendor/capacitor.js","vendor/fonts/barlow-latin-400-normal.woff2","vendor/fonts/barlow-latin-500-normal.woff2","vendor/fonts/barlow-latin-600-normal.woff2","vendor/fonts/barlow-condensed-latin-500-normal.woff2","vendor/fonts/barlow-condensed-latin-700-normal.woff2","vendor/fonts/barlow-condensed-latin-800-normal.woff2","icons/icon-192.png","icons/icon-512.png","icons/apple-touch-icon.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("burnlog-") && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;       // Supabase calls go straight to the network
  if (req.mode === "navigate" || url.pathname.endsWith(".html") || url.pathname.endsWith("config.js")) {
    // page first from the network so a new version shows up right away; cached copy when offline
    e.respondWith(fetch(req).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return r; })
      .catch(() => caches.match(req).then(r => r || caches.match("./"))));
    return;
  }
  e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res; })));
});
