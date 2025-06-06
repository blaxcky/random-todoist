const CACHE_NAME = 'random-todoist-v2';
const PREVIOUS_CACHES = ['random-todoist-v1'];

const urlsToCache = [
    './',
    './index.html',
    './styles.css',
    './app.js',
    './manifest.json',
    './icon.svg'
];

// Cache-First für statische Assets, Network-First für API calls
const CACHE_STRATEGIES = {
    CACHE_FIRST: ['styles.css', 'manifest.json', 'icon.svg'],
    NETWORK_FIRST: ['index.html', 'app.js'],
    NETWORK_ONLY: ['api.todoist.com']
};

self.addEventListener('install', event => {
    console.log('Service Worker installing...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Caching app shell');
                return cache.addAll(urlsToCache);
            })
            .then(() => {
                // Skip waiting to activate immediately
                return self.skipWaiting();
            })
    );
});

self.addEventListener('activate', event => {
    console.log('Service Worker activating...');
    
    event.waitUntil(
        Promise.all([
            // Clean up old caches
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (PREVIOUS_CACHES.includes(cacheName) || 
                            (cacheName.startsWith('random-todoist-') && cacheName !== CACHE_NAME)) {
                            console.log('Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            }),
            // Take control of all clients immediately
            self.clients.claim()
        ])
    );
});

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    
    // Skip cross-origin requests
    if (url.origin !== location.origin) {
        return;
    }
    
    // Determine strategy based on request
    const fileName = url.pathname.split('/').pop();
    let strategy = 'NETWORK_FIRST'; // default
    
    if (CACHE_STRATEGIES.CACHE_FIRST.includes(fileName)) {
        strategy = 'CACHE_FIRST';
    } else if (CACHE_STRATEGIES.NETWORK_FIRST.includes(fileName)) {
        strategy = 'NETWORK_FIRST';
    }
    
    if (strategy === 'CACHE_FIRST') {
        event.respondWith(cacheFirstStrategy(event.request));
    } else {
        event.respondWith(networkFirstStrategy(event.request));
    }
});

// Cache-First: Good for CSS, images, manifest
async function cacheFirstStrategy(request) {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
        // Return cached version immediately
        return cachedResponse;
    }
    
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        console.log('Network request failed:', error);
        throw error;
    }
}

// Network-First: Good for HTML, JS files that change frequently
async function networkFirstStrategy(request) {
    const cache = await caches.open(CACHE_NAME);
    
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            // Cache the new version
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        console.log('Network request failed, trying cache:', error);
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        throw error;
    }
}

// Listen for messages from the main thread
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});