// Service Worker pour XimaM Music Platform
const CACHE_NAME = 'ximam-audio-v1';
const AUDIO_CACHE_NAME = 'ximam-audio-files-v1';

// Installation du service worker
self.addEventListener('install', (event) => {
  console.log('Service Worker installé');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/manifest.json',
        '/android-chrome-192x192.png',
        '/android-chrome-512x512.png'
      ]);
    })
  );
});

// Activation du service worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker activé');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== AUDIO_CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Gestion des notifications
self.addEventListener('push', (event) => {
  console.log('Notification push reçue:', event);
  
  const options = {
    body: event.data ? event.data.text() : 'Nouvelle musique disponible',
    icon: '/android-chrome-192x192.png',
    badge: '/android-chrome-192x192.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'play',
        title: '▶️ Lire',
        icon: '/android-chrome-192x192.png'
      },
      {
        action: 'pause',
        title: '⏸️ Pause',
        icon: '/android-chrome-192x192.png'
      },
      {
        action: 'next',
        title: '⏭️ Suivant',
        icon: '/android-chrome-192x192.png'
      },
      {
        action: 'previous',
        title: '⏮️ Précédent',
        icon: '/android-chrome-192x192.png'
      }
    ],
    requireInteraction: true,
    silent: false
  };

  event.waitUntil(
    self.registration.showNotification('XimaM Music', options)
  );
});

// Gestion des clics sur les notifications
self.addEventListener('notificationclick', (event) => {
  console.log('Clic sur notification:', event.action);
  
  event.notification.close();

  if (event.action) {
    // Envoyer un message au client pour contrôler la lecture
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'AUDIO_CONTROL',
            action: event.action
          });
        });
      })
    );
  } else {
    // Ouvrir l'application
    event.waitUntil(
      self.clients.openWindow('/')
    );
  }
});

// Gestion des messages du client
self.addEventListener('message', (event) => {
  console.log('Message reçu du client:', event.data);
  
  if (event.data.type === 'UPDATE_NOTIFICATION') {
    const { title, body, track } = event.data;
    
    self.registration.showNotification(title, {
      body,
      icon: track?.coverUrl || '/android-chrome-192x192.png',
      badge: '/android-chrome-192x192.png',
      vibrate: [200, 100, 200],
      data: { track },
      actions: [
        {
          action: 'play',
          title: '▶️ Lire',
          icon: '/android-chrome-192x192.png'
        },
        {
          action: 'pause',
          title: '⏸️ Pause',
          icon: '/android-chrome-192x192.png'
        },
        {
          action: 'next',
          title: '⏭️ Suivant',
          icon: '/android-chrome-192x192.png'
        },
        {
          action: 'previous',
          title: '⏮️ Précédent',
          icon: '/android-chrome-192x192.png'
        }
      ],
      requireInteraction: true,
      silent: false
    });
  }
});

// Cache des fichiers audio
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/tracks/') && event.request.method === 'GET') {
    event.respondWith(
      caches.open(AUDIO_CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((response) => {
          if (response) {
            return response;
          }
          
          return fetch(event.request).then((response) => {
            if (response.status === 200) {
              cache.put(event.request, response.clone());
            }
            return response;
          });
        });
      })
    );
  }
}); 