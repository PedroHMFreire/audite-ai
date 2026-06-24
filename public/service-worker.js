// Service Worker — estratégia de cache à prova de deploy.
//
// Lições do bug de 2026-06-24: a versão anterior usava cache-first no
// index.html + nome de cache fixo, então TODO deploy ficava invisível para
// quem já tinha aberto o app (servia o bundle antigo para sempre).
//
// Agora:
//  - HTML / navegações: NETWORK-FIRST (sempre busca o index novo, que aponta
//    para os JS/CSS novos). Fallback ao cache só quando offline.
//  - Assets com hash (immutáveis): cache-first (seguro — o hash muda a cada build).
//  - Supabase/API: NÃO intercepta (evita servir dados velhos).
//  - CACHE_NAME versionado: o activate apaga os caches antigos.

const CACHE_NAME = 'audite-ai-v2';
const SHELL = '/index.html';

const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-192-maskable.png',
  '/icon-512-maskable.png'
];

self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing v2…');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE).catch((err) => {
        console.warn('[ServiceWorker] Pré-cache parcial:', err);
      }))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating v2…');
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names.filter((n) => n !== CACHE_NAME).map((n) => {
          console.log('[ServiceWorker] Apagando cache antigo:', n);
          return caches.delete(n);
        })
      ))
      .then(() => self.clients.claim())
  );
});

function isHashedAsset(url) {
  // Vite gera /assets/<nome>-<hash>.<ext> — imutável por hash.
  return url.pathname.startsWith('/assets/');
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Supabase / API: deixa passar direto (sem cache → nunca dado velho).
  if (url.origin === 'https://rwbomcidvezohsgojbgz.supabase.co' || url.pathname.includes('/api/')) {
    return;
  }

  // Navegações (HTML do SPA): NETWORK-FIRST.
  const isNavigation = request.mode === 'navigate' ||
    (request.headers.get('accept') || '').includes('text/html');

  if (isNavigation) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Se o servidor 404 numa rota do SPA, serve o index em cache.
          if (!response.ok) throw new Error('nav not ok: ' + response.status);
          const copy = response.clone();
          caches.open(CACHE_NAME).then((c) => c.put(SHELL, copy));
          return response;
        })
        .catch(() => caches.match(SHELL).then((r) => r || caches.match('/') ).then((r) => r || createOfflineFallback()))
    );
    return;
  }

  // Assets com hash: cache-first (atualiza em background se faltar).
  if (isHashedAsset(url)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => {
        if (response && response.status === 200) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, copy));
        }
        return response;
      }))
    );
    return;
  }

  // Demais GETs (ícones, manifest, etc.): stale-while-revalidate.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request).then((response) => {
        if (response && response.status === 200 && response.type !== 'error') {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, copy));
        }
        return response;
      }).catch(() => cached || createOfflineFallback());
      return cached || network;
    })
  );
});

function createOfflineFallback() {
  return new Response(
    `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Auditê - Offline</title>
      <style>body{margin:0;padding:20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#FF6B35;min-height:100vh;display:flex;align-items:center;justify-content:center}.c{background:#fff;border-radius:16px;padding:40px 20px;text-align:center;max-width:400px;box-shadow:0 20px 60px rgba(0,0,0,.25)}h1{color:#1f2937;margin:0 0 10px;font-size:22px}p{color:#6b7280;line-height:1.6}.b{display:inline-block;background:#fde68a;color:#92400e;padding:8px 16px;border-radius:20px;font-size:12px;font-weight:600;margin-bottom:16px}</style>
      </head><body><div class="c"><div class="b">🔴 OFFLINE</div><div style="font-size:48px;margin-bottom:16px">📡</div>
      <h1>Sem conexão</h1><p>Você está offline. As contagens feitas agora são salvas no aparelho e sincronizam quando a conexão voltar.</p>
      </div></body></html>`,
    { status: 503, statusText: 'Service Unavailable', headers: { 'Content-Type': 'text/html; charset=UTF-8' } }
  );
}

// =============================================
// NOTIFICATION HANDLERS
// =============================================
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  let urlToOpen = '/';
  if (data.scheduleItemId) urlToOpen = `/counts?audit=${data.scheduleItemId}`;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url === urlToOpen && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(urlToOpen);
    })
  );
});

self.addEventListener('push', (event) => {
  if (!event.data) return;
  const n = event.data.json();
  event.waitUntil(
    self.registration.showNotification(n.title || 'Auditê', {
      body: n.body || n.message,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: n.tag || 'audite-notification',
      data: n.data
    })
  );
});

console.log('[ServiceWorker] Loaded v2');
