// Avisos al móvil (lo carga el service worker de la app).
self.addEventListener('push', (event) => {
  let d = { title: 'Rivendel', body: '' };
  try {
    d = event.data ? event.data.json() : d;
  } catch {
    d = { title: 'Rivendel', body: event.data ? event.data.text() : '' };
  }
  event.waitUntil(
    self.registration.showNotification(d.title || 'Rivendel', {
      body: d.body || '',
      icon: 'icon-192.png',
      badge: 'icon-192.png',
      tag: d.tag,
      data: { url: d.url || './' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || './', self.registration.scope).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) if (c.url.startsWith(self.registration.scope) && 'focus' in c) return c.focus();
      return self.clients.openWindow(url);
    }),
  );
});
