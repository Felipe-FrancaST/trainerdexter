const CACHE = 'trainerdex-v50';
const CORE_ASSETS = [
  './', './index.html', './style.css?v=50', './app.js?v=50',
  './account.js?v=50', './battle-actions.js?v=50', './abilities-data.js?v=50',
  './move-attributes-data.js?v=50', './move-attributes.js?v=50',
  './supabase-store.js?v=50', './supabase-config.js?v=50', './manifest.json',
];
const ASSET_URLS = new Set(CORE_ASSETS.map(path => new URL(path, self.registration.scope).href));

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(key => key.startsWith('trainerdex-') && key !== CACHE).map(key => caches.delete(key))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || !ASSET_URLS.has(request.url)) return;
  // Apenas arquivos estáticos conhecidos. APIs, Supabase e outros caminhos usam a rede.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const response = await fetch(request, {cache:'no-store'});
      if (response.ok && response.type !== 'opaque') await cache.put(request, response.clone());
      return response;
    } catch (error) {
      const cached = await cache.match(request);
      if (cached) return cached;
      throw error;
    }
  })());
});
