
// Script pour forcer la mise à jour du Service Worker
(function() {
  'use strict';

  // Fonction pour forcer la mise à jour du SW
  function forceUpdateServiceWorker() {
    if ('serviceWorker' in navigator) {
      console.log('🔄 Forçage de la mise à jour du Service Worker...');
      
      // Désenregistrer tous les SW existants
      navigator.serviceWorker.getRegistrations().then(function(registrations) {
        for(let registration of registrations) {
          registration.unregister();
          console.log('🗑️ Service Worker désenregistré:', registration.scope);
        }
        
        // Nettoyer les caches
        if ('caches' in window) {
          caches.keys().then(function(cacheNames) {
            return Promise.all(
              cacheNames.map(function(cacheName) {
                console.log('🗑️ Suppression du cache:', cacheName);
                return caches.delete(cacheName);
              })
            );
          }).then(function() {
            console.log('✅ Caches nettoyés');
            
            // Recharger la page après un délai
            setTimeout(function() {
              console.log('🔄 Rechargement de la page...');
              window.location.reload();
            }, 1000);
          });
        }
      });
    }
  }

  // Fonction pour vérifier et corriger les erreurs de SW
  function checkAndFixServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(function(registration) {
        console.log('✅ Service Worker prêt:', registration.scope);
        
        // Vérifier s'il y a des erreurs récentes
        const hasErrors = sessionStorage.getItem('sw-errors');
        if (hasErrors) {
          console.log('⚠️ Erreurs SW détectées, nettoyage en cours...');
          sessionStorage.removeItem('sw-errors');
          forceUpdateServiceWorker();
        }
      }).catch(function(error) {
        console.error('❌ Erreur Service Worker:', error);
        forceUpdateServiceWorker();
      });
    }
  }

  // Fonction pour gérer les erreurs de réseau
  function handleNetworkErrors() {
    // Intercepter les erreurs de fetch
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
      return originalFetch.apply(this, args).catch(function(error) {
        console.warn('⚠️ Erreur réseau détectée:', error);
        
        // Si c'est une erreur de ressource Next.js, marquer pour nettoyage
        if (args[0] && typeof args[0] === 'string' && args[0].includes('/_next/')) {
          sessionStorage.setItem('sw-errors', 'true');
        }
        
        throw error;
      });
    };
  }

  // Initialisation
  function init() {
    console.log('🚀 Initialisation du script de correction SW...');
    
    // Attendre que le DOM soit prêt
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        checkAndFixServiceWorker();
        handleNetworkErrors();
      });
    } else {
      checkAndFixServiceWorker();
      handleNetworkErrors();
    }
    
    // Exposer les fonctions globalement pour debug
    window.forceUpdateServiceWorker = forceUpdateServiceWorker;
    window.checkAndFixServiceWorker = checkAndFixServiceWorker;
  }

  // Démarrer
  init();
})();
