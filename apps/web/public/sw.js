// StackLens AI Service Worker
// Provides offline functionality, caching, and PWA features

const CACHE_NAME = 'stacklens-ai-v1.0.0';
const STATIC_CACHE = 'stacklens-static-v1.0.0';
const DYNAMIC_CACHE = 'stacklens-dynamic-v1.0.0';
const API_CACHE = 'stacklens-api-v1.0.0';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html',
  // Add other static assets as needed
];

// API endpoints to cache
const CACHEABLE_API_PATTERNS = [
  /^\/api\/search\/.*$/,
  /^\/api\/analytics\/.*$/,
  /^\/api\/error-intelligence\/.*$/,
  /^\/api\/logs\/.*$/
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Skip waiting...');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Installation failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return cacheName !== CACHE_NAME && 
                     cacheName !== STATIC_CACHE && 
                     cacheName !== DYNAMIC_CACHE &&
                     cacheName !== API_CACHE;
            })
            .map((cacheName) => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - handle network requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle different types of requests
  if (url.pathname.startsWith('/api/')) {
    // API requests - Cache-first for GET requests
    event.respondWith(handleApiRequest(request));
  } else if (isStaticAsset(url.pathname)) {
    // Static assets - Cache-first
    event.respondWith(handleStaticRequest(request));
  } else {
    // Navigation requests - Network-first with offline fallback
    event.respondWith(handleNavigationRequest(request));
  }
});

// Handle API requests with caching strategy
async function handleApiRequest(request) {
  const url = new URL(request.url);
  
  // Check if this API endpoint should be cached
  const shouldCache = CACHEABLE_API_PATTERNS.some(pattern => pattern.test(url.pathname));
  
  if (!shouldCache) {
    // Don't cache this endpoint, just fetch
    try {
      return await fetch(request);
    } catch (error) {
      console.log('[SW] API request failed:', error);
      return new Response(
        JSON.stringify({ 
          error: 'Network unavailable',
          message: 'This feature requires an internet connection',
          offline: true 
        }),
        { 
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }

  try {
    // Network-first for API requests
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(API_CACHE);
      await cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    // If network response is not ok, try cache
    return await getCachedResponse(request, API_CACHE);
    
  } catch (error) {
    console.log('[SW] Network request failed, trying cache:', error);
    
    // Network failed, try cache
    const cachedResponse = await getCachedResponse(request, API_CACHE);
    if (cachedResponse) {
      // Add offline indicator to cached API responses
      if (cachedResponse.headers.get('content-type')?.includes('application/json')) {
        try {
          const data = await cachedResponse.json();
          return new Response(
            JSON.stringify({ ...data, cached: true, offline: true }),
            {
              status: cachedResponse.status,
              statusText: cachedResponse.statusText,
              headers: cachedResponse.headers
            }
          );
        } catch (e) {
          return cachedResponse;
        }
      }
      return cachedResponse;
    }
    
    // No cache available, return offline message
    return new Response(
      JSON.stringify({ 
        error: 'Offline',
        message: 'No cached data available for this request',
        offline: true 
      }),
      { 
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Handle static asset requests
async function handleStaticRequest(request) {
  try {
    // Cache-first for static assets
    const cachedResponse = await getCachedResponse(request, STATIC_CACHE);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Not in cache, fetch from network and cache
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      await cache.put(request, networkResponse.clone());
    }
    return networkResponse;
    
  } catch (error) {
    console.log('[SW] Static asset request failed:', error);
    return new Response('Asset not available offline', { status: 503 });
  }
}

// Handle navigation requests
async function handleNavigationRequest(request) {
  try {
    // Network-first for navigation
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful navigation responses
      const cache = await caches.open(DYNAMIC_CACHE);
      await cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    // If network response is not ok, try cache
    return await getCachedResponse(request, DYNAMIC_CACHE) || 
           await getCachedResponse('/offline.html', STATIC_CACHE) ||
           new Response('Page not available offline', { status: 503 });
    
  } catch (error) {
    console.log('[SW] Navigation request failed:', error);
    
    // Network failed, try cache
    const cachedResponse = await getCachedResponse(request, DYNAMIC_CACHE);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Show offline page
    const offlinePage = await getCachedResponse('/offline.html', STATIC_CACHE);
    if (offlinePage) {
      return offlinePage;
    }
    
    return new Response('Page not available offline', { status: 503 });
  }
}

// Helper function to get cached response
async function getCachedResponse(request, cacheName) {
  const cache = await caches.open(cacheName);
  return await cache.match(request);
}

// Helper function to check if URL is a static asset
function isStaticAsset(pathname) {
  const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.woff', '.woff2', '.ttf', '.eot'];
  return staticExtensions.some(ext => pathname.endsWith(ext));
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'error-sync') {
    event.waitUntil(syncOfflineErrors());
  } else if (event.tag === 'analytics-sync') {
    event.waitUntil(syncOfflineAnalytics());
  }
});

// Sync offline errors when back online
async function syncOfflineErrors() {
  try {
    console.log('[SW] Syncing offline errors...');
    
    // Get offline errors from IndexedDB
    const offlineErrors = await getOfflineData('errors');
    
    if (offlineErrors.length > 0) {
      // Send errors to server
      const response = await fetch('/api/error-intelligence/bulk-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ errors: offlineErrors })
      });
      
      if (response.ok) {
        console.log('[SW] Successfully synced', offlineErrors.length, 'offline errors');
        await clearOfflineData('errors');
        
        // Notify all clients
        await notifyClients({
          type: 'OFFLINE_SYNC_COMPLETE',
          data: { type: 'errors', count: offlineErrors.length }
        });
      }
    }
  } catch (error) {
    console.error('[SW] Error syncing offline errors:', error);
  }
}

// Sync offline analytics when back online
async function syncOfflineAnalytics() {
  try {
    console.log('[SW] Syncing offline analytics...');
    
    // Get offline analytics from IndexedDB
    const offlineAnalytics = await getOfflineData('analytics');
    
    if (offlineAnalytics.length > 0) {
      // Send analytics to server
      for (const analytics of offlineAnalytics) {
        try {
          await fetch('/api/analytics/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(analytics)
          });
        } catch (error) {
          console.error('[SW] Failed to sync analytics event:', error);
        }
      }
      
      console.log('[SW] Successfully synced', offlineAnalytics.length, 'offline analytics events');
      await clearOfflineData('analytics');
    }
  } catch (error) {
    console.error('[SW] Error syncing offline analytics:', error);
  }
}

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (error) {
    console.error('[SW] Error parsing push data:', error);
    data = { title: 'StackLens AI', body: 'New notification' };
  }
  
  const options = {
    title: data.title || 'StackLens AI',
    body: data.body || 'You have a new notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: data.tag || 'stacklens-notification',
    requireInteraction: data.urgent || false,
    actions: [
      {
        action: 'open',
        title: 'Open App',
        icon: '/icons/open.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icons/dismiss.png'
      }
    ],
    data: {
      url: data.url || '/',
      timestamp: Date.now()
    }
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'StackLens AI', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'dismiss') {
    return;
  }
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        // Check if app is already open
        for (const client of clients) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Open new window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Message handling for communication with main thread
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  const { type, data } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'STORE_OFFLINE_DATA':
      storeOfflineData(data.type, data.payload);
      break;
      
    case 'GET_CACHE_STATUS':
      getCacheStatus().then(status => {
        event.ports[0].postMessage({ type: 'CACHE_STATUS', data: status });
      });
      break;
      
    case 'CLEAR_CACHE':
      clearAllCaches().then(() => {
        event.ports[0].postMessage({ type: 'CACHE_CLEARED' });
      });
      break;
  }
});

// Utility functions for IndexedDB operations
async function getOfflineData(type) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('StackLensOfflineDB', 1);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction([type], 'readonly');
      const store = transaction.objectStore(type);
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => resolve(getAllRequest.result || []);
      getAllRequest.onerror = () => reject(getAllRequest.error);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create object stores
      if (!db.objectStoreNames.contains('errors')) {
        db.createObjectStore('errors', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('analytics')) {
        db.createObjectStore('analytics', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

async function storeOfflineData(type, data) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('StackLensOfflineDB', 1);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction([type], 'readwrite');
      const store = transaction.objectStore(type);
      const addRequest = store.add(data);
      
      addRequest.onsuccess = () => resolve(addRequest.result);
      addRequest.onerror = () => reject(addRequest.error);
    };
  });
}

async function clearOfflineData(type) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('StackLensOfflineDB', 1);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction([type], 'readwrite');
      const store = transaction.objectStore(type);
      const clearRequest = store.clear();
      
      clearRequest.onsuccess = () => resolve();
      clearRequest.onerror = () => reject(clearRequest.error);
    };
  });
}

// Get cache status for debugging
async function getCacheStatus() {
  const cacheNames = await caches.keys();
  const status = {};
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    status[cacheName] = {
      size: keys.length,
      urls: keys.map(request => request.url)
    };
  }
  
  return status;
}

// Clear all caches
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
}

// Notify all clients
async function notifyClients(message) {
  const clients = await self.clients.matchAll();
  clients.forEach(client => client.postMessage(message));
}

console.log('[SW] Service worker script loaded');