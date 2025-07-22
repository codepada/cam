const CACHE_NAME = 'pwa-camera-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/style.css',
    '/script.js',
    '/manifest.json',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png',
    '/icons/gallery-placeholder.png' // อย่าลืมเพิ่มรูป placeholder ของคุณ
];

// ติดตั้ง Service Worker และ Cache ไฟล์
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

// ดักจับ Fetch requests และตอบกลับจาก Cache หากมี
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Cache hit - return response
                if (response) {
                    return response;
                }
                // If not in cache, fetch from network
                return fetch(event.request);
            })
    );
});

// ล้าง Cache เก่าเมื่อ Service Worker ใหม่ติดตั้ง
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});