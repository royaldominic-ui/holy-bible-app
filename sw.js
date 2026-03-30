// ═══════════════════════════════════════════════════════════════
// HOLY BIBLE APP — SERVICE WORKER (sw.js)
// Place this file in your GitHub Pages ROOT directory
// ═══════════════════════════════════════════════════════════════

var CACHE_NAME = 'holy-bible-v3';
var DYNAMIC_CACHE = 'holy-bible-dynamic-v3';

// Files to cache on install (app shell)
var SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  // Fonts (cache for offline)
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Crimson+Text:ital,wght@0,400;0,600;1,400;1,600&family=Cinzel:wght@400;600;700&family=Lora:ital,wght@0,400;0,600;1,400&display=swap'
];

// ── Install: cache shell ─────────────────────────────────────
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      console.log('[SW] Caching app shell');
      return cache.addAll(SHELL_ASSETS.map(url => new Request(url, { mode: 'no-cors' })));
    }).then(() => self.skipWaiting())
  );
});

// ── Activate: clean old caches ────────────────────────────────
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME && k !== DYNAMIC_CACHE)
            .map(k => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

// ── Fetch: Cache-first for assets, Network-first for API ───────
self.addEventListener('fetch', function(e) {
  var url = new URL(e.request.url);

  // Skip non-GET and cross-origin API calls
  if (e.request.method !== 'GET') return;
  if (url.pathname.startsWith('/api/')) return;
  if (url.hostname.includes('firebaseapp') || url.hostname.includes('googleapis')) return;
  if (url.hostname.includes('anthropic')) return;

  // Audio files: network-only (too large to cache)
  if (url.pathname.match(/\.(mp3|ogg|wav|m4a)$/)) return;

  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) {
        // Return cached, but refresh in background (stale-while-revalidate)
        var fetchUpdate = fetch(e.request).then(function(res) {
          if (res && res.status === 200) {
            var clone = res.clone();
            caches.open(DYNAMIC_CACHE).then(cache => cache.put(e.request, clone));
          }
          return res;
        }).catch(() => {});
        return cached;
      }

      // Not cached — fetch and cache
      return fetch(e.request).then(function(res) {
        if (!res || res.status !== 200 || res.type === 'opaque') return res;
        var clone = res.clone();
        caches.open(DYNAMIC_CACHE).then(function(cache) {
          cache.put(e.request, clone);
          // Limit dynamic cache to 150 items
          cache.keys().then(function(keys) {
            if (keys.length > 150) cache.delete(keys[0]);
          });
        });
        return res;
      }).catch(function() {
        // Offline fallback
        if (e.request.headers.get('accept')?.includes('text/html')) {
          return caches.match('./index.html');
        }
      });
    })
  );
});

// ── Background Sync — save pending notes/bookmarks ──────────
self.addEventListener('sync', function(e) {
  if (e.tag === 'sync-user-data') {
    e.waitUntil(syncPendingData());
  }
});

async function syncPendingData() {
  // Implemented in the main app — this just signals readiness
  var clients = await self.clients.matchAll();
  clients.forEach(client => client.postMessage({ type: 'SYNC_READY' }));
}

// ── Push Notifications ─────────────────────────────────────
self.addEventListener('push', function(e) {
  var data = e.data ? e.data.json() : {};
  e.waitUntil(
    self.registration.showNotification(data.title || '✝️ Holy Bible', {
      body: data.body || 'Your daily verse is ready',
      icon: './icons/icon-192.png',
      badge: './icons/icon-192.png',
      tag: 'hb-daily',
      renotify: true,
      data: { url: data.url || './' }
    })
  );
});

self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  e.waitUntil(
    clients.openWindow(e.notification.data?.url || './')
  );
});
