/**
 * iOS-Compatible Health Tracker PWA Service Worker
 * Version 3.0 - Optimized for iOS Safari
 */

// Cache names with version for iOS compatibility
const CACHE_NAME = "daily-tracker-v3-ios";
const RUNTIME_CACHE = "daily-tracker-runtime-v3";
const FONTS_CACHE = "daily-tracker-fonts-v3";

// Core app files to cache
const CORE_FILES = [
  './',
  './index.html',
  './core/core-styles.css',
  './core/core-scripts.js',
  './core/notification.js',
  './core/ui.js',
  './trackers/trackers-scripts.js',
  './trackers/trackers-styles.css',
  './workouts/workouts-scripts.js',
  './workouts/workouts-styles.css',
  './habits/habits-scripts.js',
  './habits/habits-styles.css',
  './manifest.json'
];

// External resources
const EXTERNAL_RESOURCES = [
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  'https://fonts.googleapis.com/icon?family=Material+Icons+Round'
];

// iOS Safari detection
const isIOSSafari = () => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && /Safari/.test(navigator.userAgent);
};

// Install event - Optimized for iOS
self.addEventListener('install', (event) => {
  console.log('[SW] Installing for iOS...');
  
  // Skip waiting immediately for iOS compatibility
  self.skipWaiting();
  
  event.waitUntil(
    Promise.all([
      // Cache core files
      caches.open(CACHE_NAME).then(cache => {
        console.log('[SW] Caching core files...');
        return Promise.allSettled(
          CORE_FILES.map(url => {
            return cache.add(url).catch(err => {
              console.warn(`[SW] Failed to cache ${url}:`, err);
              return Promise.resolve(); // Don't fail install for individual files
            });
          })
        );
      }),
      
      // Cache external resources separately
      caches.open(FONTS_CACHE).then(cache => {
        console.log('[SW] Caching external resources...');
        return Promise.allSettled(
          EXTERNAL_RESOURCES.map(url => {
            return fetch(url, {
              mode: 'cors',
              credentials: 'omit'
            })
            .then(response => {
              if (response.ok) {
                return cache.put(url, response);
              }
              throw new Error(`Failed to fetch ${url}`);
            })
            .catch(err => {
              console.warn(`[SW] Failed to cache external resource ${url}:`, err);
              return Promise.resolve();
            });
          })
        );
      })
    ])
    .then(() => {
      console.log('[SW] Installation complete');
    })
    .catch(error => {
      console.error('[SW] Installation failed:', error);
    })
  );
});

// Activate event - iOS-specific cleanup
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME && 
                cacheName !== RUNTIME_CACHE && 
                cacheName !== FONTS_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      
      // Take control of all clients immediately (important for iOS)
      self.clients.claim()
    ])
    .then(() => {
      console.log('[SW] Activation complete');
    })
  );
});

// Fetch event - iOS-optimized strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Handle different types of requests
  if (url.origin !== self.location.origin) {
    // External resource handling
    event.respondWith(handleExternalResource(request));
  } else {
    // Same-origin resource handling
    event.respondWith(handleSameOriginResource(request));
  }
});

// Handle external resources (fonts, etc.)
async function handleExternalResource(request) {
  const url = new URL(request.url);
  
  // Handle Google Fonts specifically
  if (url.hostname.includes('fonts.g')) {
    try {
      // Try cache first
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
      
      // Fetch with timeout for iOS
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(request, {
        signal: controller.signal,
        mode: 'cors',
        credentials: 'omit'
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        // Cache for future use
        const cache = await caches.open(FONTS_CACHE);
        cache.put(request, response.clone()).catch(err => {
          console.warn('[SW] Failed to cache font:', err);
        });
        return response;
      }
      
      throw new Error(`Font fetch failed: ${response.status}`);
      
    } catch (error) {
      console.warn('[SW] Font fetch failed:', error);
      
      // Return CSS fallback for fonts
      if (request.url.includes('.css')) {
        return new Response(`
          /* Fallback fonts for iOS */
          @import url('data:text/css;base64,');
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        `, {
          headers: { 'Content-Type': 'text/css' },
          status: 200
        });
      }
      
      // For other external resources, let browser handle
      return fetch(request).catch(() => {
        return new Response('Resource unavailable', { status: 503 });
      });
    }
  }
  
  // For other external resources, let browser handle normally
  return fetch(request);
}

// Handle same-origin resources
async function handleSameOriginResource(request) {
  try {
    // Network-first strategy for HTML documents (for updates)
    if (request.destination === 'document') {
      return await networkFirstStrategy(request);
    }
    
    // Cache-first strategy for static assets
    return await cacheFirstStrategy(request);
    
  } catch (error) {
    console.warn('[SW] Fetch strategy failed:', error);
    
    // Ultimate fallback
    if (request.destination === 'document') {
      const fallback = await caches.match('./index.html');
      return fallback || new Response('App offline', {
        status: 503,
        headers: { 'Content-Type': 'text/html' }
      });
    }
    
    return new Response('Resource unavailable', { status: 503 });
  }
}

// Network-first strategy (for HTML)
async function networkFirstStrategy(request) {
  try {
    // Try network first with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const networkResponse = await fetch(request, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (networkResponse.ok) {
      // Update cache in background
      updateCacheInBackground(request, networkResponse.clone());
      return networkResponse;
    }
    
    throw new Error(`Network response not ok: ${networkResponse.status}`);
    
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', error.message);
    
    // Fallback to cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

// Cache-first strategy (for static assets)
async function cacheFirstStrategy(request) {
  // Try cache first
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Not in cache, fetch from network
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache the response
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone()).catch(err => {
        console.warn('[SW] Failed to cache response:', err);
      });
    }
    
    return networkResponse;
    
  } catch (error) {
    console.warn('[SW] Network fetch failed:', error);
    throw error;
  }
}

// Background cache update
async function updateCacheInBackground(request, response) {
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response);
    console.log('[SW] Cache updated in background');
  } catch (error) {
    console.warn('[SW] Background cache update failed:', error);
  }
}

// Handle skip waiting message
self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'skipWaiting') {
    console.log('[SW] Skip waiting requested');
    self.skipWaiting();
  }
});

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  let notificationData = {
    title: 'Daily Tracker',
    body: 'Time to update your health tracking!',
    icon: './icons/icon-192.png',
    badge: './icons/icon-192.png',
    tag: 'health-reminder',
    renotify: true,
    requireInteraction: false,
    actions: [
      {
        action: 'open',
        title: 'Open App',
        icon: './icons/icon-192.png'
      }
    ]
  };
  
  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = { ...notificationData, ...data };
    } catch (error) {
      console.warn('[SW] Failed to parse push data:', error);
    }
  }
  
  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');
  
  event.notification.close();
  
  const action = event.action || 'open';
  
  if (action === 'open') {
    event.waitUntil(
      clients.matchAll({
        type: 'window',
        includeUncontrolled: true
      }).then(clientList => {
        // Focus existing window if available
        for (const client of clientList) {
          if (client.url.includes(self.location.origin)) {
            return client.focus();
          }
        }
        
        // Open new window
        if (clients.openWindow) {
          return clients.openWindow('./');
        }
      })
    );
  }
});

// Background sync (for future use)
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'health-data-sync') {
    event.waitUntil(
      // Future: sync health data when back online
      Promise.resolve()
    );
  }
});

// Periodic background sync (for future use)
self.addEventListener('periodicsync', (event) => {
  console.log('[SW] Periodic sync:', event.tag);
  
  if (event.tag === 'daily-reminder') {
    event.waitUntil(
      // Future: send daily reminders
      Promise.resolve()
    );
  }
});