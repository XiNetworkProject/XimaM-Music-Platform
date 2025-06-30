// Service Worker pour XimaM Music Platform
const CACHE_NAME = 'ximam-audio-v3';
const AUDIO_CACHE_NAME = 'ximam-audio-files-v3';
const NOTIFICATION_TAG = 'ximam-music-player';

// Fonction helper pour vérifier si une requête peut être mise en cache
function canCacheRequest(request) {
  const url = new URL(request.url);
  
  // Vérifier le schéma
  if (url.protocol === 'chrome-extension:' || 
      url.protocol === 'moz-extension:' || 
      url.protocol === 'ms-browser-extension:' ||
      url.protocol === 'data:' ||
      url.protocol === 'blob:') {
    return false;
  }
  
  // Vérifier que c'est une requête HTTP/HTTPS
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return false;
  }
  
  return true;
}

// Installation du service worker
self.addEventListener('install', (event) => {
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
  self.skipWaiting();
});

// Activation du service worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Nettoyer les anciens caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== AUDIO_CACHE_NAME) {
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

// Gestion des messages du service worker
self.addEventListener('message', (event) => {
  // Gestion du skip waiting
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }
  
  if (event.data.type === 'UPDATE_NOTIFICATION') {
    const { title, body, track, isPlaying } = event.data;
    
    // Vérifier les permissions
    if (Notification.permission !== 'granted') {
      return;
    }
    
    // Fermer les notifications existantes
    self.registration.getNotifications({ tag: NOTIFICATION_TAG }).then((notifications) => {
      notifications.forEach(notification => {
        notification.close();
      });
    });

    // Créer la nouvelle notification avec les données les plus récentes
    const options = {
      body: body || `${track?.artist?.name || track?.artist?.username} - ${isPlaying ? 'En lecture' : 'En pause'}`,
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

    // Utiliser le titre fourni ou générer un titre par défaut
    const notificationTitle = title || track?.title || 'XimaM Music';

    self.registration.showNotification(notificationTitle, options).then(() => {
    }).catch(() => {
    });
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
  
  // Ignorer les requêtes avec des schémas non supportés
  if (!canCacheRequest(event.request)) {
    return;
  }
  
  // Cache des fichiers audio
  if (url.pathname.includes('/api/tracks/') && event.request.method === 'GET') {
    event.respondWith(
      caches.open(AUDIO_CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((response) => {
          if (response) {
            return response;
          }
          
          return fetch(event.request).then((response) => {
            if (response.status === 200 && canCacheRequest(event.request)) {
              try {
                cache.put(event.request, response.clone());
              } catch (error) {
              }
            }
            return response;
          }).catch(() => {
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
            if (response.status === 200 && canCacheRequest(event.request)) {
              try {
                cache.put(event.request, response.clone());
              } catch (error) {
              }
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
  // Empêcher la propagation de l'erreur
  event.preventDefault();
});

self.addEventListener('unhandledrejection', (event) => {
  // Empêcher la propagation de l'erreur
  event.preventDefault();
}); 