// Builds www/ (the iOS app's web folder) from src/app.html.
// src/app.html is also the exact file published as the Claude artifact, so the app has one source.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "www");
const nm = p => join(root, "node_modules", p);

rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, "vendor", "fonts"), { recursive: true });

// Fonts: self-hosted so the app works offline
const faces = [
  ["Barlow", "@fontsource/barlow/files/barlow-latin-400-normal.woff2", 400],
  ["Barlow", "@fontsource/barlow/files/barlow-latin-500-normal.woff2", 500],
  ["Barlow", "@fontsource/barlow/files/barlow-latin-600-normal.woff2", 600],
  ["Barlow Condensed", "@fontsource/barlow-condensed/files/barlow-condensed-latin-500-normal.woff2", 500],
  ["Barlow Condensed", "@fontsource/barlow-condensed/files/barlow-condensed-latin-700-normal.woff2", 700],
  ["Barlow Condensed", "@fontsource/barlow-condensed/files/barlow-condensed-latin-800-normal.woff2", 800],
];
let css = "";
for (const [family, file, weight] of faces) {
  const name = file.split("/").pop();
  copyFileSync(nm(file), join(out, "vendor", "fonts", name));
  css += `@font-face{font-family:"${family}";font-style:normal;font-weight:${weight};font-display:swap;src:url(fonts/${name}) format("woff2")}\n`;
}
writeFileSync(join(out, "vendor", "fonts.css"), css);
copyFileSync(nm("@supabase/supabase-js/dist/umd/supabase.js"), join(out, "vendor", "supabase.js"));
copyFileSync(nm("@capacitor/core/dist/capacitor.js"), join(out, "vendor", "capacitor.js"));

// Sync settings: burnlog.config.json -> www/config.js (missing file = on-phone only, no sync)
const cfgPath = join(root, "burnlog.config.json");
const cfg = existsSync(cfgPath) ? JSON.parse(readFileSync(cfgPath, "utf8")) : {};
writeFileSync(join(out, "config.js"),
  `window.BURNLOG_CONFIG=${JSON.stringify({ supabaseUrl: cfg.supabaseUrl || "", supabaseKey: cfg.supabaseKey || "" })};\n`);

// Page: swap Google Fonts for local fonts and add the document shell the artifact viewer normally supplies
let app = readFileSync(join(root, "src", "app.html"), "utf8");
app = app.replace(/<link rel="preconnect"[^>]*>\n?/, "").replace(/<link href="https:\/\/fonts\.googleapis\.com[^>]*>\n?/, "");
const head = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,viewport-fit=cover">
<meta name="format-detection" content="telephone=no">
<meta name="theme-color" content="#E9EDF2" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0F1726" media="(prefers-color-scheme: dark)">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="Burn Log">
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<link rel="icon" type="image/png" sizes="192x192" href="icons/icon-192.png">
<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}
body{-webkit-user-select:none;user-select:none}input,textarea{-webkit-user-select:text;user-select:text}</style>
<link rel="stylesheet" href="vendor/fonts.css">
<script src="vendor/capacitor.js"></script>
<script src="vendor/supabase.js"></script>
<script src="config.js"></script>
<script>
// Web link only: offline support. The iOS app build and the Claude link skip this.
if ("serviceWorker" in navigator && !(window.Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform()) && location.protocol !== "file:")
  addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
</script>
</head>
<body>
`;
writeFileSync(join(out, "index.html"), head + app + "\n</body>\n</html>\n");

// Home-screen install: icons, manifest, and a service worker so the web link opens offline
mkdirSync(join(out, "icons"), { recursive: true });
for (const f of ["icon-192.png", "icon-512.png", "apple-touch-icon.png"]) copyFileSync(join(root, "assets", "web", f), join(out, "icons", f));
writeFileSync(join(out, "manifest.webmanifest"), JSON.stringify({
  name: "Burn Log", short_name: "Burn Log", description: "Workout log: calories, lifting sessions and progress.",
  start_url: "./", scope: "./", display: "standalone", orientation: "portrait",
  background_color: "#13203A", theme_color: "#13203A",
  icons: [
    { src: "icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
  ]
}, null, 2));
const shell = ["./", "index.html", "config.js", "manifest.webmanifest", "vendor/fonts.css", "vendor/supabase.js", "vendor/capacitor.js",
  ...faces.map(([, f]) => "vendor/fonts/" + f.split("/").pop()), "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png"];
const hash = createHash("sha256");
for (const f of shell.slice(1)) hash.update(readFileSync(join(out, f)));
const version = hash.digest("hex").slice(0, 10);
writeFileSync(join(out, "sw.js"), `// Burn Log offline cache. Version changes whenever any shipped file changes.
const CACHE = "burnlog-${version}";
const SHELL = ${JSON.stringify(shell)};
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
`);
console.log(`Built www/ (sync ${cfg.supabaseUrl ? "on: " + cfg.supabaseUrl : "off: add burnlog.config.json to turn it on"})`);
