// Service Worker pour XimaM Music Platform
const CACHE_NAME = 'ximam-audio-v2';
const AUDIO_CACHE_NAME = 'ximam-audio-files-v2';
const NOTIFICATION_TAG = 'ximam-music-player';

// Installation du service worker
self.addEventListener('install', (event) => {
  console.log('Service Worker installé v2');
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
  // Forcer l'activation immédiate
  self.skipWaiting();
});

// Activation du service worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker activé v2');
  event.waitUntil(
    Promise.all([
      // Nettoyer les anciens caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== AUDIO_CACHE_NAME) {
              console.log('Suppression ancien cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Prendre le contrôle immédiatement
      self.clients.claim()
    ])
  );
});

// Gestion des notifications push
self.addEventListener('push', (event) => {
  console.log('Notification push reçue:', event);
  
  let notificationData = {
    title: 'XimaM Music',
    body: 'Nouvelle musique disponible',
    icon: '/android-chrome-192x192.png',
    badge: '/android-chrome-192x192.png',
    tag: NOTIFICATION_TAG
  };

  // Essayer de parser les données de la notification
  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        ...notificationData,
        ...data
      };
    } catch (error) {
      notificationData.body = event.data.text() || notificationData.body;
    }
  }

  const options = {
    ...notificationData,
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
      ...notificationData.data
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
    silent: false,
    renotify: true
  };

  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
  );
});

// Gestion des clics sur les notifications
self.addEventListener('notificationclick', (event) => {
  console.log('Clic sur notification:', event.action);
  
  event.notification.close();

  if (event.action) {
    // Envoyer un message au client pour contrôler la lecture
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        const message = {
          type: 'AUDIO_CONTROL',
          action: event.action,
          timestamp: Date.now()
        };

        // Envoyer à tous les clients
        clients.forEach((client) => {
          client.postMessage(message);
        });

        // Si aucun client n'est ouvert, ouvrir l'application
        if (clients.length === 0) {
          return self.clients.openWindow('/');
        }
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
    const { title, body, track, isPlaying } = event.data;
    
    // Fermer les notifications existantes
    self.registration.getNotifications({ tag: NOTIFICATION_TAG }).then((notifications) => {
      notifications.forEach(notification => notification.close());
    });

    // Créer la nouvelle notification
    const options = {
      body,
      icon: track?.coverUrl || '/android-chrome-192x192.png',
      badge: '/android-chrome-192x192.png',
      vibrate: [200, 100, 200],
      data: { track, isPlaying },
      tag: NOTIFICATION_TAG,
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
      silent: false,
      renotify: true
    };

    self.registration.showNotification(title, options);
  }

  if (event.data.type === 'CLEAR_NOTIFICATIONS') {
    self.registration.getNotifications().then((notifications) => {
      notifications.forEach(notification => notification.close());
    });
  }
});

// Cache des fichiers audio avec stratégie améliorée
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Cache des fichiers audio
  if (url.pathname.includes('/api/tracks/') && event.request.method === 'GET') {
    event.respondWith(
      caches.open(AUDIO_CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((response) => {
          if (response) {
            console.log('Audio servi depuis le cache:', url.pathname);
            return response;
          }
          
          return fetch(event.request).then((response) => {
            if (response.status === 200) {
              console.log('Audio mis en cache:', url.pathname);
              cache.put(event.request, response.clone());
            }
            return response;
          }).catch((error) => {
            console.error('Erreur fetch audio:', error);
            // Retourner une réponse d'erreur
            return new Response('Erreur audio', { status: 500 });
          });
        });
      })
    );
    return;
  }

  // Cache des ressources statiques
  if (event.request.destination === 'image' || 
      event.request.destination === 'script' || 
      event.request.destination === 'style') {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
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
    return;
  }

  // Pour les autres requêtes, utiliser la stratégie network-first
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request);
      });
    })
  );
});

// Gestion des erreurs
self.addEventListener('error', (event) => {
  console.error('Erreur Service Worker:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('Promesse rejetée Service Worker:', event.reason);
}); 