// Service Worker Optimisé pour XimaM Music Platform
const CACHE_VERSION = 'v4';
const STATIC_CACHE = `xima-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `xima-dynamic-${CACHE_VERSION}`;
const AUDIO_CACHE = `xima-audio-${CACHE_VERSION}`;
const API_CACHE = `xima-api-${CACHE_VERSION}`;
const NOTIFICATION_TAG = 'ximam-music-player';

// Ressources à mettre en cache statiquement
const STATIC_RESOURCES = [
  '/',
  '/manifest.json',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
  '/apple-touch-icon.png',
  '/favicon.ico'
];

// Routes API à mettre en cache
const API_ROUTES = [
  '/api/tracks',
  '/api/tracks/popular',
  '/api/tracks/trending',
  '/api/tracks/recent',
  '/api/playlists',
  '/api/users'
];

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

// Fonction pour nettoyer les anciens caches
async function cleanupOldCaches() {
  const cacheNames = await caches.keys();
  const currentCaches = [STATIC_CACHE, DYNAMIC_CACHE, AUDIO_CACHE, API_CACHE];
  
  return Promise.all(
    cacheNames.map(cacheName => {
      if (!currentCaches.includes(cacheName)) {
        console.log('Suppression du cache:', cacheName);
        return caches.delete(cacheName);
      }
    })
  );
}

// Installation du service worker
self.addEventListener('install', (event) => {
  console.log('🔄 Installation du Service Worker optimisé...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('📦 Mise en cache des ressources statiques...');
      return cache.addAll(STATIC_RESOURCES);
    }).then(() => {
      console.log('✅ Service Worker installé avec succès');
      return self.skipWaiting();
    }).catch((error) => {
      console.error('❌ Erreur lors de l\'installation:', error);
    })
  );
});

// Activation du service worker
self.addEventListener('activate', (event) => {
  console.log('🚀 Activation du Service Worker optimisé...');
  
  event.waitUntil(
    Promise.all([
      cleanupOldCaches(),
      self.clients.claim()
    ]).then(() => {
      console.log('✅ Service Worker activé avec succès');
    }).catch((error) => {
      console.error('❌ Erreur lors de l\'activation:', error);
    })
  );
});

// Stratégie de cache intelligente
async function cacheStrategy(request, cacheName, strategy = 'network-first') {
  const cache = await caches.open(cacheName);
  
  switch (strategy) {
    case 'cache-first':
      // Vérifier le cache d'abord
      const cachedResponse = await cache.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
      
      // Si pas en cache, récupérer depuis le réseau
      try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
          await cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      } catch (error) {
        return new Response('Erreur réseau', { status: 503 });
      }
      
    case 'network-first':
      // Essayer le réseau d'abord
      try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
          await cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      } catch (error) {
        // Si le réseau échoue, utiliser le cache
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }
        return new Response('Erreur réseau', { status: 503 });
      }
      
         case 'stale-while-revalidate':
       // Retourner immédiatement depuis le cache si disponible
       const staleResponse = await cache.match(request);
       
       // En arrière-plan, mettre à jour le cache
       fetch(request).then(async (networkResponse) => {
         if (networkResponse.ok) {
           await cache.put(request, networkResponse.clone());
         }
       }).catch(() => {
         // Ignorer les erreurs de mise à jour en arrière-plan
       });
       
       if (staleResponse) {
         return staleResponse;
       }
       
       // Si pas en cache, attendre le réseau
       try {
         const networkResponse = await fetch(request);
         if (networkResponse.ok) {
           await cache.put(request, networkResponse.clone());
         }
         return networkResponse;
       } catch (error) {
         return new Response('Erreur réseau', { status: 503 });
       }
      
    default:
      return fetch(request);
  }
}

// Gestion des requêtes fetch
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Ignorer les requêtes avec des schémas non supportés
  if (!canCacheRequest(event.request)) {
    return;
  }
  
  // Cache des fichiers audio avec stratégie cache-first
  if (url.pathname.includes('/api/tracks/') && event.request.method === 'GET') {
    event.respondWith(
      cacheStrategy(event.request, AUDIO_CACHE, 'cache-first')
    );
    return;
  }
  
  // Cache des routes API avec stratégie stale-while-revalidate
  if (API_ROUTES.some(route => url.pathname.startsWith(route))) {
    event.respondWith(
      cacheStrategy(event.request, API_CACHE, 'stale-while-revalidate')
    );
    return;
  }
  
  // Cache des ressources statiques avec stratégie cache-first
  if (event.request.destination === 'image' || 
      event.request.destination === 'script' || 
      event.request.destination === 'style' ||
      event.request.destination === 'font') {
    event.respondWith(
      cacheStrategy(event.request, STATIC_CACHE, 'cache-first')
    );
    return;
  }
  
  // Cache des pages avec stratégie network-first
  if (event.request.destination === 'document') {
    event.respondWith(
      cacheStrategy(event.request, DYNAMIC_CACHE, 'network-first')
    );
    return;
  }
  
  // Pour les autres requêtes, utiliser la stratégie network-first
  event.respondWith(
    cacheStrategy(event.request, DYNAMIC_CACHE, 'network-first')
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
  
  // Nouveau: Préchargement intelligent
  if (event.data.type === 'PRELOAD_PAGE') {
    const { path } = event.data;
    event.waitUntil(
      fetch(path, { method: 'HEAD' }).then(response => {
        if (response.ok) {
          return caches.open(DYNAMIC_CACHE).then(cache => {
            return fetch(path).then(fullResponse => {
              return cache.put(path, fullResponse.clone());
            });
          });
        }
      }).catch(() => {
        // Ignorer les erreurs de préchargement
      })
    );
  }
});

// Gestion des erreurs
self.addEventListener('error', (event) => {
  console.error('Service Worker Error:', event.error);
  event.preventDefault();
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('Service Worker Unhandled Rejection:', event.reason);
  event.preventDefault();
}); 