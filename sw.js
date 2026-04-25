// FieldOS Service Worker — Offline-first for field use
const CACHE = 'fieldos-v1';
const SHELL = ['/'];

// On install: cache the app shell
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

// On activate: clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch strategy:
// - API calls (gateway): network-first, fallback to cache
// - App shell: cache-first, fallback to network
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Always pass through non-GET and cross-origin API calls (except gateway)
  if (e.request.method !== 'GET') return;

  // Gateway API: network-first with cache fallback + background refresh
  if (url.hostname === 'nexus.paynekiller1204.workers.dev') {
    e.respondWith(
      fetch(e.request.clone())
        .then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(e.request).then(cached =>
          cached || new Response(JSON.stringify({ error: 'offline', records: [] }), {
            headers: { 'Content-Type': 'application/json' }
          })
        ))
    );
    return;
  }

  // App shell: cache-first
  e.respondWith(
    caches.match(e.request).then(cached => {
      const network = fetch(e.request).then(res => {
        if (res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        return res;
      });
      return cached || network;
    })
  );
});

// Background Sync: retry queued log submissions
self.addEventListener('sync', e => {
  if (e.tag === 'fieldos-sync') {
    e.waitUntil(flushQueue());
  }
});

async function flushQueue() {
  const clients = await self.clients.matchAll();
  clients.forEach(c => c.postMessage({ type: 'sync-start' }));
}

// Push notifications
self.addEventListener('push', e => {
  const data = e.data?.json() ?? { title: 'FieldOS', body: 'You have a new update.' };
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.tag || 'fieldos',
      data: { url: data.url || '/' },
      actions: data.actions || [],
      vibrate: [200, 100, 200],
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const target = e.notification.data?.url || '/';
  e.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clients => {
      const existing = clients.find(c => c.url.includes(self.location.origin));
      if (existing) return existing.focus().then(c => c.navigate(target));
      return self.clients.openWindow(target);
    })
  );
});
