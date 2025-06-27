// Service Worker ultra-optimisé pour XimaM Music Platform
const CACHE_NAME = 'ximam-audio-v2';
const AUDIO_CACHE_NAME = 'ximam-audio-files-v2';
const NOTIFICATION_TAG = 'ximam-audio-notification';

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
  // Activation immédiate
  self.skipWaiting();
});

// Activation du service worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker activé v2');
  event.waitUntil(
    Promise.all([
      // Prendre le contrôle immédiatement
      self.clients.claim(),
      // Nettoyer les anciens caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== AUDIO_CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      })
    ])
  );
});

// Gestion des notifications push optimisée
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
    requireInteraction: false,
    silent: false,
    tag: NOTIFICATION_TAG
  };

  event.waitUntil(
    self.registration.showNotification('XimaM Music', options)
  );
});

// Gestion des clics sur les notifications optimisée
self.addEventListener('notificationclick', (event) => {
  console.log('Clic sur notification:', event.action);
  
  // Fermer la notification immédiatement
  event.notification.close();

  if (event.action) {
    // Envoyer un message au client pour contrôler la lecture
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        // Essayer d'abord les clients contrôlés
        let targetClients = clients.filter(client => client.controller);
        
        // Si aucun client contrôlé, utiliser tous les clients
        if (targetClients.length === 0) {
          targetClients = clients;
        }

        // Envoyer le message à tous les clients
        targetClients.forEach((client) => {
          client.postMessage({
            type: 'AUDIO_CONTROL',
            action: event.action,
            timestamp: Date.now()
          });
        });

        // Si aucun client n'est ouvert, en ouvrir un
        if (targetClients.length === 0) {
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

// Gestion des messages du client optimisée
self.addEventListener('message', (event) => {
  console.log('Message reçu du client:', event.data);
  
  if (event.data.type === 'UPDATE_NOTIFICATION') {
    const { title, body, track } = event.data;
    
    // Fermer les notifications existantes
    self.registration.getNotifications({ tag: NOTIFICATION_TAG }).then(notifications => {
      notifications.forEach(notification => notification.close());
    });
    
    // Créer une nouvelle notification
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
      requireInteraction: false,
      silent: false,
      tag: NOTIFICATION_TAG
    });
  }
});

// Cache des fichiers audio optimisé
self.addEventListener('fetch', (event) => {
  // Cache des fichiers audio
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
  
  // Cache des ressources statiques
  else if (event.request.destination === 'image' || 
           event.request.destination === 'script' || 
           event.request.destination === 'style') {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  }
});

// Gestion des erreurs
self.addEventListener('error', (event) => {
  console.error('Erreur Service Worker:', event.error);
});

// Gestion des rejets de promesses non gérés
self.addEventListener('unhandledrejection', (event) => {
  console.error('Promesse rejetée non gérée:', event.reason);
}); 