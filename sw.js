const CACHE = 'trainerdex-v44';
const CORE_ASSETS = [
  './', './index.html', './style.css?v=44', './app.js?v=44',
  './account.js?v=43', './battle-actions.js?v=44', './abilities-data.js?v=35',
  './move-attributes-data.js?v=44', './move-attributes.js?v=44',
  './supabase-store.js?v=43', './supabase-config.js?v=34', './manifest.json',
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
  event.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok && response.type !== 'opaque') {
      event.waitUntil(cache.put(request, response.clone()));
    }
    return response;
  }));
});
