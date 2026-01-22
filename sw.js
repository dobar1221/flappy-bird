
const CACHE_NAME = 'flappy-bird-v1';
const ASSETS = [
  './',
  './index.html',
  './index.tsx',
  './App.tsx',
  './constants.tsx',
  './types.ts',
  './services/audioService.ts',
  './services/geminiService.ts',
  'https://cdn.tailwindcss.com'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
