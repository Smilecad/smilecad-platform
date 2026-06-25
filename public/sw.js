// public/sw.js
self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  let payload = {}

  try {
    payload = event.data ? event.data.json() : {}
  } catch (_) {
    payload = {
      title: 'SmileCAD 알림',
      body: event.data ? event.data.text() : '새 알림이 도착했습니다.',
    }
  }

  const title = payload.title || 'SmileCAD 알림'
  const options = {
    body: payload.body || '새 알림이 도착했습니다.',
    icon: payload.icon || '/icons/icon-192.png',
    badge: payload.badge || '/icons/badge-72.png',
    tag: payload.tag || `smilecad-${Date.now()}`,
    data: {
      url: payload.url || '/orders',
      orderId: payload.orderId || payload.order_id || null,
      eventType: payload.eventType || payload.event_type || null,
    },
    requireInteraction: Boolean(payload.requireInteraction),
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const targetUrl = event.notification?.data?.url || '/orders'
  const urlToOpen = new URL(targetUrl, self.location.origin).href

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client && client.url === urlToOpen) {
            return client.focus()
          }
        }

        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen)
        }

        return null
      })
  )
})
