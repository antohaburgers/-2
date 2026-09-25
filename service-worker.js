// One-time retirement worker: removes the previous PWA cache and unregisters itself.
self.addEventListener('install', event => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil((async () => {
  await Promise.all((await caches.keys()).map(key => caches.delete(key)));
  await self.registration.unregister();
  const windows = await self.clients.matchAll({ type: 'window' });
  windows.forEach(client => client.navigate(client.url));
})()));
