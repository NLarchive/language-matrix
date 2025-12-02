/**
 * Service Worker for Janulus Matrix - Production Ready
 * Handles offline support, audio file caching, and PWA functionality
 * Version: 1.0.0
 * 
 * Cache Strategy:
 * - Audio files (MP3): Cache-first with network updates
 * - Static assets (JS, CSS): Cache-first with network fallback
 * - Data files (CSV, JSON): Stale-while-revalidate
 * - HTML pages: Network-first with cache fallback
 */

const CACHE_VERSION = 'v2';
const CACHE_NAME = `janulus-matrix-${CACHE_VERSION}`;
const AUDIO_CACHE_NAME = `janulus-audio-${CACHE_VERSION}`;

// Resources to cache on install (only files that actually exist)
const STATIC_ASSETS = [
    './',
    './index.html',
    './css/style.css',
    './css/matrix_table.css',
    './js/main.js',
    './js/components/MatrixTableBuilder.js',
    './js/components/SentenceDisplay.js',
    './js/utils/csvLoader.js',
    './js/utils/audioCache.js',
    './js/utils/cacheManager.js',
    './data/config.csv',
    './data/vocab.csv',
    './data/matrix_index.json',
    './data/categories_config.csv',
    './data/chinese_basic.csv',
    './data/chinese_intermediate.csv',
    './data/chinese_advanced.csv',
    './favicon.svg'
];

// Install event - cache static assets with improved error tracking
self.addEventListener('install', (event) => {
    console.info('[ServiceWorker] Installing version:', CACHE_VERSION);
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(async (cache) => {
                console.info('[ServiceWorker] Caching static assets');
                const results = await Promise.allSettled(
                    STATIC_ASSETS.map(async (asset) => {
                        try {
                            const response = await fetch(asset, { cache: 'no-cache' });
                            if (!response.ok) {
                                return { asset, status: 'failed', reason: `HTTP ${response.status}` };
                            }
                            await cache.put(asset, response.clone());
                            return { asset, status: 'cached' };
                        } catch (err) {
                            return { asset, status: 'failed', reason: err.message };
                        }
                    })
                );
                
                const successful = results.filter(r => r.value?.status === 'cached').length;
                const failed = results.filter(r => r.value?.status === 'failed').length;
                console.info(`[ServiceWorker] Cached ${successful}/${STATIC_ASSETS.length} assets (${failed} failures)`);
            })
            .catch((error) => {
                console.error('[ServiceWorker] Cache installation failed:', error.message);
            })
    );
    self.skipWaiting();
});

// Activate event - clean up old versioned caches
self.addEventListener('activate', (event) => {
    console.info('[ServiceWorker] Activating version:', CACHE_VERSION);
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        // Delete any old versioned caches
                        if (cacheName.startsWith('janulus-') && 
                            cacheName !== CACHE_NAME && 
                            cacheName !== AUDIO_CACHE_NAME) {
                            console.info('[ServiceWorker] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.info('[ServiceWorker] Activation complete');
            })
            .catch((error) => {
                console.error('[ServiceWorker] Activation error:', error.message);
            })
    );
    self.clients.claim();
});

// Fetch event handler
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Ignore favicon.ico requests
    if (url.pathname.endsWith('favicon.ico')) {
        return;
    }

    // Audio files - cache first strategy with background updates
    if (request.url.includes('/assets/audio/') && request.url.endsWith('.mp3')) {
        event.respondWith(handleAudioRequest(request));
        return;
    }

    // Static assets - cache first
    if (isStaticAsset(request.url)) {
        event.respondWith(cacheFirst(request, CACHE_NAME));
        return;
    }

    // Treat matrix_index.json as network-first so clients always get latest configuration
    if (url.pathname.endsWith('/data/matrix_index.json') || url.pathname.endsWith('/matrix_index.json')) {
        event.respondWith(networkFirst(request, CACHE_NAME));
        return;
    }

    // CSV and JSON data files - stale-while-revalidate for most data, but matrix_index handled above
    if (request.url.includes('/data/') || request.url.endsWith('.csv') || request.url.endsWith('.json')) {
        event.respondWith(staleWhileRevalidate(request, CACHE_NAME));
        return;
    }

    // HTML pages and other requests - network first
    event.respondWith(networkFirst(request, CACHE_NAME));
});

// Helper function to identify static assets
function isStaticAsset(url) {
    return STATIC_ASSETS.some(asset => url.includes(asset)) ||
           url.endsWith('.js') ||
           url.endsWith('.css') ||
           url.endsWith('.svg') ||
           url.endsWith('.png') ||
           url.endsWith('.ico') ||
           url.endsWith('.webmanifest');
}

// Cache first strategy - return cached response, fallback to network
async function cacheFirst(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
        return cachedResponse;
    }
    
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone()).catch((err) => {
                console.warn('[ServiceWorker] Failed to cache:', request.url, err.message);
            });
        }
        return networkResponse;
    } catch (error) {
        console.warn('[ServiceWorker] Network request failed:', request.url);
        return new Response('Offline - resource unavailable', { status: 503 });
    }
}

// Network first strategy - try network, fallback to cache
async function networkFirst(request, cacheName) {
    const cache = await caches.open(cacheName);
    
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone()).catch((err) => {
                console.warn('[ServiceWorker] Failed to cache:', request.url, err.message);
            });
        }
        return networkResponse;
    } catch (error) {
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
            console.info('[ServiceWorker] Serving from cache (offline):', request.url);
            return cachedResponse;
        }
        return new Response('Offline - resource unavailable', { status: 503 });
    }
}

// Stale-while-revalidate strategy - return cached, update in background
async function staleWhileRevalidate(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    const fetchPromise = fetch(request)
        .then((networkResponse) => {
            if (networkResponse.ok) {
                cache.put(request, networkResponse.clone()).catch((err) => {
                    console.warn('[ServiceWorker] Failed to cache:', request.url, err.message);
                });
            }
            return networkResponse;
        })
        .catch(() => null);
    
    return cachedResponse || fetchPromise || new Response('Offline', { status: 503 });
}

// Handle audio requests with optimized caching and path matching
async function handleAudioRequest(request) {
    const cache = await caches.open(AUDIO_CACHE_NAME);
    const url = new URL(request.url);
    
    // Try exact match first
    let cachedResponse = await cache.match(request);
    
    // Try alternate path formats if not found
    if (!cachedResponse) {
        const pathVariations = [
            url.pathname,
            url.pathname.startsWith('/') ? url.pathname : '/' + url.pathname,
            url.pathname.replace(/^\//, '')
        ];
        
        for (const path of pathVariations) {
            try {
                // Ensure path starts with / for proper URL construction
                const normalizedPath = path.startsWith('/') ? path : '/' + path;
                const altRequest = new Request(url.origin + normalizedPath);
                cachedResponse = await cache.match(altRequest);
                if (cachedResponse) {
                    console.info('[ServiceWorker] Audio from cache (variant match):', url.pathname);
                    return cachedResponse;
                }
            } catch (e) {
                // Skip invalid URL constructions
                console.warn('[ServiceWorker] Invalid path variation:', path);
            }
        }
    }
    
    if (cachedResponse) {
        console.info('[ServiceWorker] Audio from cache:', url.pathname);
        return cachedResponse;
    }
    
    // Fetch from network
    try {
        const networkResponse = await fetch(request);
        
        if (!networkResponse.ok) {
            console.warn('[ServiceWorker] Audio fetch returned:', networkResponse.status, url.pathname);
            return networkResponse;
        }
        
        // Clone response before caching (don't consume original)
        const responseToCache = networkResponse.clone();
        cache.put(request, responseToCache).catch((err) => {
            console.warn('[ServiceWorker] Failed to cache audio:', url.pathname, err.message);
        });
        
        console.info('[ServiceWorker] Audio cached:', url.pathname);
        return networkResponse;
    } catch (error) {
        console.warn('[ServiceWorker] Audio fetch error:', url.pathname, error.message);
        return new Response('Audio unavailable', { status: 503 });
    }
}

// Message event - handles cache management commands from client
self.addEventListener('message', (event) => {
    const { type } = event.data;
    
    switch (type) {
        case 'CLEAR_AUDIO_CACHE':
            handleClearAudioCache(event);
            break;
        case 'CLEAR_ALL_CACHE':
            handleClearAllCache(event);
            break;
        case 'GET_CACHE_SIZE':
            handleGetCacheSize(event);
            break;
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;
        case 'GET_VERSION':
            event.ports[0]?.postMessage({ version: CACHE_VERSION });
            break;
    }
});

async function handleClearAudioCache(event) {
    try {
        await caches.delete(AUDIO_CACHE_NAME);
        console.info('[ServiceWorker] Audio cache cleared');
        event.ports[0]?.postMessage({ success: true });
    } catch (error) {
        console.error('[ServiceWorker] Failed to clear audio cache:', error.message);
        event.ports[0]?.postMessage({ success: false, error: error.message });
    }
}

async function handleClearAllCache(event) {
    try {
        const cacheNames = await caches.keys();
        await Promise.all(
            cacheNames
                .filter(name => name.startsWith('janulus-'))
                .map(name => caches.delete(name))
        );
        console.info('[ServiceWorker] All caches cleared');
        event.ports[0]?.postMessage({ success: true });
    } catch (error) {
        console.error('[ServiceWorker] Failed to clear all caches:', error.message);
        event.ports[0]?.postMessage({ success: false, error: error.message });
    }
}

async function handleGetCacheSize(event) {
    try {
        const audioCache = await caches.open(AUDIO_CACHE_NAME);
        const keys = await audioCache.keys();
        
        let totalSize = 0;
        for (const request of keys) {
            const response = await audioCache.match(request);
            if (response) {
                const blob = await response.clone().blob();
                totalSize += blob.size;
            }
        }
        
        event.ports[0]?.postMessage({ 
            success: true, 
            fileCount: keys.length,
            totalSizeBytes: totalSize,
            totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2)
        });
    } catch (error) {
        console.error('[ServiceWorker] Failed to get cache size:', error.message);
        event.ports[0]?.postMessage({ success: false, error: error.message });
    }
}
