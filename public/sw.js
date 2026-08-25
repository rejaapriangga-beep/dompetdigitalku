// public/sw.js
// Service worker minimal — cuma untuk memenuhi syarat "installable" PWA
// dan menyimpan ikon shell di cache. SENGAJA TIDAK meng-cache halaman/data
// keuangan, supaya angka yang ditampilkan tidak pernah basi/salah kalau
// device sedang offline (selalu utamakan data dari jaringan).
const CACHE_NAME = "buku-keuangan-shell-v1";
const SHELL_ASSETS = ["/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
