self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(clients.claim());
});

self.addEventListener('fetch', (e) => {
  // A basic fetch handler is required to qualify as a PWA
  e.respondWith(fetch(e.request));
});
