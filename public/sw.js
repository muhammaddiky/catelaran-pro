// Service Worker untuk offline functionality
const CACHE_VERSION = 'catelaran-v1'
const CACHE_NAME = `${CACHE_VERSION}-${new Date().getTime()}`

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/sw.js',
]

const DYNAMIC_ASSETS = [
  'https://cdn.jsdelivr.net/npm/tesseract.js@5.0.4/dist/tesseract.min.js',
  'https://cdn.tailwindcss.com',
]

// Install event - cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Service Worker: Caching static assets')
      return cache.addAll(STATIC_ASSETS)
    })
  )
  self.skipWaiting()
})

// Activate event - clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && cacheName.startsWith('catelaran')) {
            console.log('Service Worker: Deleting old cache', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
  self.clients.claim()
})

// Fetch event - network first, then cache
self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }

  // Network first for API calls
  if (url.origin !== location.origin) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Cache successful API responses
          if (response.status === 200) {
            const cache = caches.open(CACHE_NAME)
            cache.then(c => c.put(request, response.clone()))
          }
          return response
        })
        .catch(() => {
          // Fallback to cache on network error
          return caches.match(request).then(cached => {
            return cached || new Response('Offline - cached response unavailable', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({ 'Content-Type': 'text/plain' })
            })
          })
        })
    )
    return
  }

  // Cache first for static assets
  if (
    request.url.match(/\.(js|css|png|jpg|jpeg|svg|gif|webp|woff|woff2|ttf|eot)$/i)
  ) {
    event.respondWith(
      caches.match(request).then(cached => {
        return cached || fetch(request).then(response => {
          if (response.status === 200) {
            const cache = caches.open(CACHE_NAME)
            cache.then(c => c.put(request, response.clone()))
          }
          return response
        })
      })
    )
    return
  }

  // Stale while revalidate for documents
  event.respondWith(
    caches.match(request).then(cached => {
      const fetchPromise = fetch(request).then(response => {
        if (response.status === 200) {
          const cache = caches.open(CACHE_NAME)
          cache.then(c => c.put(request, response.clone()))
        }
        return response
      })

      return cached || fetchPromise
    })
  )
})

// Handle background sync (future feature)
self.addEventListener('sync', event => {
  if (event.tag === 'sync-expenses') {
    event.waitUntil(
      // Handle sync logic here
      Promise.resolve()
    )
  }
})

console.log('Service Worker loaded')