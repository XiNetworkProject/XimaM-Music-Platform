// Script pour forcer la mise à jour du service worker
console.log('🔧 Forçage de la mise à jour du service worker...');

// Fonction pour nettoyer tous les caches
async function clearAllCaches() {
  try {
    const cacheNames = await caches.keys();
    console.log('📋 Caches trouvés:', cacheNames);
    
    await Promise.all(
      cacheNames.map(cacheName => {
        console.log('🗑️ Suppression du cache:', cacheName);
        return caches.delete(cacheName);
      })
    );
    
    console.log('✅ Tous les caches ont été supprimés');
  } catch (error) {
    console.error('❌ Erreur lors de la suppression des caches:', error);
  }
}

// Fonction pour forcer la mise à jour du service worker
async function forceUpdateServiceWorker() {
  try {
    if ('serviceWorker' in navigator) {
      console.log('🔄 Désenregistrement du service worker actuel...');
      
      // Désenregistrer tous les service workers
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations.map(registration => registration.unregister())
      );
      
      console.log('✅ Service workers désenregistrés');
      
      // Attendre un peu
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Réenregistrer le service worker
      console.log('🔄 Réenregistrement du service worker...');
      const registration = await navigator.serviceWorker.register('/sw.js', {
        updateViaCache: 'none'
      });
      
      console.log('✅ Service worker réenregistré:', registration);
      
      // Forcer l'activation
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
      
      // Attendre l'activation
      await new Promise(resolve => {
        if (registration.active) {
          resolve();
        } else {
          registration.addEventListener('activate', resolve, { once: true });
        }
      });
      
      console.log('✅ Service worker activé');
      
      // Nettoyer les caches après l'activation
      await clearAllCaches();
      
      console.log('🎉 Mise à jour terminée avec succès !');
      
      // Recharger la page pour appliquer les changements
      setTimeout(() => {
        console.log('🔄 Rechargement de la page...');
        window.location.reload();
      }, 2000);
      
    } else {
      console.log('❌ Service Worker non supporté');
    }
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour:', error);
  }
}

// Fonction pour vérifier l'état des notifications
async function checkNotificationStatus() {
  console.log('🔍 Vérification du statut des notifications...');
  
  if (!('Notification' in window)) {
    console.log('❌ Notifications non supportées');
    return;
  }
  
  console.log('📱 Permission actuelle:', Notification.permission);
  
  if (Notification.permission === 'granted') {
    console.log('✅ Notifications autorisées');
    
    // Tester l'affichage d'une notification
    try {
      const testNotification = new Notification('Test XimaM', {
        body: 'Test de notification',
        icon: '/android-chrome-192x192.png',
        tag: 'test'
      });
      
      setTimeout(() => {
        testNotification.close();
        console.log('✅ Test de notification réussi');
      }, 3000);
      
    } catch (error) {
      console.error('❌ Erreur test notification:', error);
    }
  } else {
    console.log('⚠️ Notifications non autorisées');
  }
}

// Fonction pour vérifier l'état du service worker
async function checkServiceWorkerStatus() {
  console.log('🔍 Vérification du statut du service worker...');
  
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.getRegistration();
    
    if (registration) {
      console.log('✅ Service worker enregistré');
      console.log('📋 État:', registration.active ? 'Actif' : 'Inactif');
      console.log('🔄 En attente:', registration.waiting ? 'Oui' : 'Non');
      console.log('📦 Installation:', registration.installing ? 'En cours' : 'Terminée');
    } else {
      console.log('❌ Aucun service worker enregistré');
    }
  } else {
    console.log('❌ Service Worker non supporté');
  }
}

// Exécuter les vérifications et la mise à jour
async function main() {
  console.log('🚀 Démarrage du script de mise à jour...');
  
  // Vérifications initiales
  await checkServiceWorkerStatus();
  await checkNotificationStatus();
  
  // Demander confirmation
  const shouldUpdate = confirm(
    'Voulez-vous forcer la mise à jour du service worker et nettoyer le cache ?\n\n' +
    'Cela va :\n' +
    '• Désenregistrer le service worker actuel\n' +
    '• Nettoyer tous les caches\n' +
    '• Réenregistrer le service worker\n' +
    '• Recharger la page'
  );
  
  if (shouldUpdate) {
    await forceUpdateServiceWorker();
  } else {
    console.log('❌ Mise à jour annulée par l\'utilisateur');
  }
}

// Exposer les fonctions globalement pour utilisation dans la console
window.forceUpdateSW = {
  clearAllCaches,
  forceUpdateServiceWorker,
  checkNotificationStatus,
  checkServiceWorkerStatus,
  main
};

// Exécuter automatiquement si le script est chargé directement
if (typeof window !== 'undefined') {
  main();
} 