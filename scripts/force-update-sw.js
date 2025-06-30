// Script pour forcer la mise à jour du service worker
// Utile pour résoudre les problèmes de cache sur mobile

async function main() {
  // Début du script de mise à jour du service worker
  
  if (!('serviceWorker' in navigator)) {
    // Service Worker non supporté
    return;
  }

  try {
    // Désenregistrer tous les service workers existants
    const registrations = await navigator.serviceWorker.getRegistrations();
    
    // Service worker(s) trouvé(s)
    
    for (const registration of registrations) {
      // Désenregistrement du service worker
      await registration.unregister();
    }

    // Nettoyer tous les caches
    const cacheNames = await caches.keys();
    
    // Cache(s) trouvé(s)
    
    for (const cacheName of cacheNames) {
      // Suppression du cache
      await caches.delete(cacheName);
    }

    // Attendre un peu avant de réenregistrer
    // Attente de 2 secondes
    
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Réenregistrement du service worker
    const newRegistration = await navigator.serviceWorker.register('/sw.js');
    
    // Service worker réenregistré
    
    // Activer le service worker en attente
    if (newRegistration.waiting) {
      newRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      
      // Attendre l'activation
      await new Promise(resolve => {
        const handleActivate = () => {
          newRegistration.removeEventListener('activate', handleActivate);
          resolve();
        };
        newRegistration.addEventListener('activate', handleActivate);
      });
      
      // Service worker activé avec succès!
      
      // Recharger la page
      window.location.reload();
    }
  } catch (error) {
    // Erreur lors de la mise à jour
  }
}

// Fonction pour diagnostiquer les problèmes mobiles
async function diagnoseMobileIssues() {
  // Détection mobile - Vérification des problèmes courants
  
  // Vérifier les permissions microphone
  if (navigator.permissions) {
    try {
      const result = await navigator.permissions.query({ name: 'microphone' });
      // Permission microphone
    } catch (error) {
      // Permission microphone non supportée
    }
  }
  
  // Vérifier le support audio
  const audioSupport = {
    webkitAudioContext: !!window.webkitAudioContext,
    AudioContext: !!window.AudioContext,
    HTMLAudioElement: !!window.HTMLAudioElement,
    canPlayType: document.createElement('audio').canPlayType('audio/mpeg') !== ''
  };
  
  // Support audio
  
  // Vérifier les éléments audio
  const audioElements = document.querySelectorAll('audio');
  
  // Éléments audio trouvés
  
  return {
    audioSupport,
    audioElements: audioElements.length
  };
}

// Exposer les fonctions globalement
if (typeof window !== 'undefined') {
  window.forceUpdateSW = {
    main,
    diagnoseMobileIssues
  };
  
  // Script terminé - Fonctions exposées globalement
} 