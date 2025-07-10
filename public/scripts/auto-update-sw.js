console.log('🔄 Script de mise à jour automatique du Service Worker...');

// Configuration
const SW_UPDATE_INTERVAL = 5 * 60 * 1000; // 5 minutes
const SW_CHECK_INTERVAL = 30 * 1000; // 30 secondes

// Fonction pour vérifier et forcer la mise à jour du service worker
async function checkAndUpdateServiceWorker() {
  try {
    if (!('serviceWorker' in navigator)) {
      console.log('❌ Service Worker non supporté');
      return;
    }

    const registration = await navigator.serviceWorker.getRegistration();
    
    if (!registration) {
      console.log('📝 Aucun Service Worker enregistré, enregistrement...');
      await navigator.serviceWorker.register('/sw.js');
      return;
    }

    // Vérifier s'il y a une mise à jour en attente
    if (registration.waiting) {
      console.log('🔄 Mise à jour en attente détectée, activation...');
      
      // Envoyer le message pour skip waiting
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      
      // Attendre l'activation
      await new Promise(resolve => {
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'activated') {
                console.log('✅ Nouveau Service Worker activé');
                resolve();
              }
            });
          }
        });
      });
      
      // Désactivé : reload automatique supprimé
      // setTimeout(() => {
      //   console.log('🔄 Rechargement de la page pour appliquer les mises à jour...');
      //   window.location.reload();
      // }, 1000);
      
      return;
    }

    // Forcer la vérification de mise à jour
    console.log('🔍 Vérification des mises à jour...');
    await registration.update();
    
  } catch (error) {
    console.error('❌ Erreur lors de la vérification du Service Worker:', error);
  }
}

// Fonction pour nettoyer le cache automatiquement
async function autoCleanCache() {
  try {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      const oldCaches = cacheNames.filter(name => 
        name.startsWith('ximam-') && 
        !name.includes('v3') // Garder la version actuelle
      );
      
      if (oldCaches.length > 0) {
        console.log('🧹 Nettoyage automatique des anciens caches...');
        await Promise.all(oldCaches.map(name => caches.delete(name)));
        console.log(`✅ ${oldCaches.length} anciens caches supprimés`);
      }
    }
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage automatique du cache:', error);
  }
}

// Fonction pour améliorer la navigation audio
function enhanceAudioNavigation() {
  // Exposer des fonctions globales pour la navigation audio
  window.audioNavigation = {
    // Fonction pour forcer la navigation vers la piste suivante
    forceNext: () => {
      if (window.audioService?.actions?.nextTrack) {
        console.log('🎵 Navigation forcée vers la piste suivante...');
        window.audioService.actions.nextTrack();
        return true;
      }
      console.log('❌ Service audio non disponible');
      return false;
    },
    
    // Fonction pour forcer la navigation vers la piste précédente
    forcePrevious: () => {
      if (window.audioService?.actions?.previousTrack) {
        console.log('🎵 Navigation forcée vers la piste précédente...');
        window.audioService.actions.previousTrack();
        return true;
      }
      console.log('❌ Service audio non disponible');
      return false;
    },
    
    // Fonction pour charger toutes les pistes
    loadAllTracks: async () => {
      if (window.audioService?.actions?.loadAllTracks) {
        console.log('📚 Chargement forcé de toutes les pistes...');
        await window.audioService.actions.loadAllTracks();
        return true;
      }
      console.log('❌ Service audio non disponible');
      return false;
    },
    
    // Fonction pour obtenir l'état du service audio
    getStatus: () => {
      if (window.audioService) {
        return {
          tracksLoaded: window.audioService.allTracks?.length || 0,
          currentTrack: window.audioService.state?.currentTrack?.title || 'Aucune',
          isPlaying: window.audioService.state?.isPlaying || false,
          queueLength: window.audioService.queue?.length || 0
        };
      }
      return null;
    }
  };
  
  console.log('🎵 Navigation audio améliorée disponible via window.audioNavigation');
}

// Fonction pour initialiser la surveillance automatique
function initAutoUpdate() {
  console.log('🚀 Initialisation de la surveillance automatique...');
  
  // Vérification initiale
  checkAndUpdateServiceWorker();
  autoCleanCache();
  enhanceAudioNavigation();
  
  // Surveillance périodique
  setInterval(checkAndUpdateServiceWorker, SW_CHECK_INTERVAL);
  setInterval(autoCleanCache, SW_UPDATE_INTERVAL);
  
  // Écouter les événements de mise à jour
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // Désactivé : reload automatique supprimé
      // console.log('🔄 Contrôleur Service Worker changé, rechargement...');
      // window.location.reload();
    });
  }
  
  console.log('✅ Surveillance automatique initialisée');
}

// Fonction pour forcer une mise à jour immédiate
async function forceImmediateUpdate() {
  console.log('⚡ Mise à jour immédiate forcée...');
  
  try {
    // Nettoyer le cache
    await autoCleanCache();
    
    // Vérifier et mettre à jour le service worker
    await checkAndUpdateServiceWorker();
    
    // Améliorer la navigation audio
    enhanceAudioNavigation();
    
    console.log('✅ Mise à jour immédiate terminée');
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour immédiate:', error);
  }
}

// Exposer les fonctions globalement
window.autoUpdateSW = {
  checkAndUpdateServiceWorker,
  autoCleanCache,
  enhanceAudioNavigation,
  forceImmediateUpdate,
  initAutoUpdate
};

// Démarrer automatiquement
initAutoUpdate();

console.log('✅ Script de mise à jour automatique chargé');
console.log('📝 Utilisez window.autoUpdateSW.forceImmediateUpdate() pour forcer une mise à jour');
console.log('🎵 Utilisez window.audioNavigation pour la navigation audio améliorée'); 