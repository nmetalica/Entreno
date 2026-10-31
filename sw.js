// Guarda la app en el móvil para usarla sin conexión. Cambia VERSION al actualizar los archivos.
const VERSION = 'v1-2026-10-31';
const FILES = ['./', 'index.html', 'rutina.html', 'comidas.html', 'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png', 'icon-512-maskable.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Primero lo guardado (funciona sin cobertura); de fondo, si hay red, se actualiza la copia.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.open(VERSION).then(async c => {
    const hit = await c.match(e.request, {ignoreSearch: true});
    const net = fetch(e.request).then(r => { if (r && r.ok && new URL(e.request.url).origin === location.origin) c.put(e.request, r.clone()); return r; }).catch(() => null);
    return hit || (await net) || c.match('index.html');
  }));
});
