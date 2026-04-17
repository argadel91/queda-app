const CACHE_NAME = 'queda-v6'
const STATIC_ASSETS = [
  '/manifest.json',
  '/icon-192.svg',
  '/icon-512.svg',
  '/og.png'
]

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return
  const url = new URL(e.request.url)
  // Never intercept: HTML, JS bundles, API calls, fonts, external services
  if (
    url.pathname === '/' ||
    url.pathname.endsWith('.html') ||
    url.pathname.startsWith('/assets/') ||
    url.hostname.includes('supabase') ||
    url.hostname.includes('sentry') ||
    url.hostname.includes('googleapis') ||
    url.hostname.includes('gstatic')
  ) return
  // Only cache static assets (icons, manifest, images)
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  )
})

// Push notification handler — ready for when server-side push is wired.
// TODO(push): set up VAPID keys + Vercel Function to send web-push.
self.addEventListener('push', e => {
  const data = e.data?.json?.() || {}
  const title = data.title || 'queda'
  const options = {
    body: data.body || '',
    icon: '/icon-192.svg',
    badge: '/icon-192.svg',
    data: { url: data.url || '/' },
  }
  e.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', e => {
  e.notification.close()
  const url = e.notification.data?.url || '/'
  e.waitUntil(clients.matchAll({ type: 'window' }).then(cls => {
    const match = cls.find(c => c.url.includes(url) && 'focus' in c)
    if (match) return match.focus()
    return clients.openWindow(url)
  }))
})
