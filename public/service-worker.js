const CACHE_NAME = 'audite-ai-v1';
const SKIP_WAITING = true;

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-192-maskable.png',
  '/icon-512-maskable.png'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[ServiceWorker] Caching static assets');
        return cache.addAll(STATIC_ASSETS).catch((err) => {
          console.warn('[ServiceWorker] Failed to cache some assets:', err);
          // Continue even if some assets fail (e.g., not on first load)
          return Promise.resolve();
        });
      })
      .then(() => {
        if (SKIP_WAITING) self.skipWaiting();
      })
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME && name.startsWith('audite-ai-'))
            .map((name) => {
              console.log('[ServiceWorker] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip API requests (network-first strategy)
  if (url.origin === 'https://rwbomcidvezohsgojbgz.supabase.co' || url.pathname.includes('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful responses
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // Return offline fallback or cached response
          return caches.match(request)
            .then((cachedResponse) => cachedResponse || createOfflineFallback());
        })
    );
    return;
  }

  // Static assets - cache-first strategy
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request)
          .then((response) => {
            // Cache successful responses
            if (response && response.status === 200 && response.type !== 'error') {
              const responseToCache = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseToCache);
              });
            }
            return response;
          })
          .catch((error) => {
            console.warn('[ServiceWorker] Fetch failed:', request.url, error);
            // Return offline fallback
            return createOfflineFallback();
          });
      })
  );
});

// Offline fallback response
function createOfflineFallback() {
  return new Response(
    `<!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Audite.AI - Offline</title>
      <style>
        body {
          margin: 0;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: linear-gradient(135deg, #7C3AED 0%, #06B6D4 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .container {
          background: white;
          border-radius: 12px;
          padding: 40px 20px;
          text-align: center;
          max-width: 400px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        h1 {
          color: #1f2937;
          margin: 0 0 10px 0;
          font-size: 24px;
        }
        p {
          color: #6b7280;
          line-height: 1.6;
          margin: 20px 0;
        }
        .icon {
          font-size: 48px;
          margin-bottom: 20px;
        }
        .offline-badge {
          display: inline-block;
          background: #fca5a5;
          color: #7f1d1d;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          margin-bottom: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="offline-badge">🔴 OFFLINE</div>
        <div class="icon">📡</div>
        <h1>Sem conexão</h1>
        <p>Parece que você perdeu a conexão com a internet.</p>
        <p style="font-size: 13px; color: #9ca3af;">
          Dados em cache podem estar disponíveis quando você voltar online.
        </p>
      </div>
    </body>
    </html>`,
    {
      status: 503,
      statusText: 'Service Unavailable',
      headers: {
        'Content-Type': 'text/html; charset=UTF-8'
      }
    }
  );
}

// Handle background sync (optional - for queuing actions when offline)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-counts') {
    event.waitUntil(
      // Sync pending counts here
      Promise.resolve()
    );
  }
});

console.log('[ServiceWorker] Loaded');
