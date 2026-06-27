/* Service Worker do MDC - permite uso offline */

const CACHE_NOME = 'mdc-cache-v5';
const ARQUIVOS = [
    './',
    './index.html',
    './styles.css',
    './app.js',
    './manifest.json',
    './logo.png',
    './icons/icon-192.png',
    './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NOME).then((cache) => cache.addAll(ARQUIVOS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((chaves) => {
            return Promise.all(
                chaves.filter((c) => c !== CACHE_NOME).map((c) => caches.delete(c))
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    event.respondWith(
        caches.match(event.request).then((resposta) => {
            return resposta || fetch(event.request).then((respostaRede) => {
                return caches.open(CACHE_NOME).then((cache) => {
                    try {
                        cache.put(event.request, respostaRede.clone());
                    } catch (e) { /* ignore */ }
                    return respostaRede;
                });
            }).catch(() => resposta);
        })
    );
});
