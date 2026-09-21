// Service worker do "Notícias Hoje"
// Troque o número da versão sempre que atualizar os arquivos,
// senão o celular continua servindo a versão antiga do cache.
const CACHE = 'noticias-v1';

const ARQUIVOS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png'
];

// Instalação: guarda os arquivos do app no cache.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(ARQUIVOS))
      .then(() => self.skipWaiting())
  );
});

// Ativação: apaga caches de versões antigas.
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(nomes => Promise.all(
        nomes.filter(nome => nome !== CACHE).map(nome => caches.delete(nome))
      ))
      .then(() => self.clients.claim())
  );
});

// Requisições: responde do cache primeiro; se não houver, busca na rede.
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(resposta => {
      if (resposta) return resposta;

      return fetch(event.request).catch(() => caches.match('./index.html'));
    })
  );
});
