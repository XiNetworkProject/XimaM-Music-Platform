// Script pour forcer la mise à jour du service worker
// Utile pour résoudre les problèmes de cache sur mobile

console.log('🔄 Début du script de mise à jour du service worker...');

async function forceUpdateServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.log('❌ Service Worker non supporté');
    return;
  }

  try {
    // 1. Désenregistrer tous les service workers existants
    const registrations = await navigator.serviceWorker.getRegistrations();
    console.log(`📊 ${registrations.length} service worker(s) trouvé(s)`);
    
    for (const registration of registrations) {
      console.log('🗑️ Désenregistrement du service worker:', registration.scope);
      await registration.unregister();
    }

    // 2. Nettoyer le cache
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      console.log(`🗑️ Nettoyage de ${cacheNames.length} cache(s)`);
      
      for (const cacheName of cacheNames) {
        console.log('🗑️ Suppression du cache:', cacheName);
        await caches.delete(cacheName);
      }
    }

    // 3. Attendre un peu
    console.log('⏳ Attente de 2 secondes...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 4. Réenregistrer le service worker
    console.log('📝 Réenregistrement du service worker...');
    const newRegistration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none' // Force la mise à jour
    });

    console.log('✅ Service worker réenregistré:', newRegistration);
    
    // 5. Forcer l'activation immédiate
    if (newRegistration.waiting) {
      console.log('🔄 Activation du service worker en attente...');
      newRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }

    // 6. Attendre l'activation
    await new Promise((resolve) => {
      if (newRegistration.active) {
        resolve();
      } else {
        newRegistration.addEventListener('activate', resolve, { once: true });
      }
    });

    console.log('✅ Service worker activé avec succès!');
    
    // 7. Recharger la page pour appliquer les changements
    console.log('🔄 Rechargement de la page...');
    setTimeout(() => {
      window.location.reload();
    }, 1000);

  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour:', error);
  }
}

// Fonction pour détecter les problèmes mobiles
function detectMobileIssues() {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  if (isMobile) {
    console.log('📱 Détection mobile - Vérification des problèmes courants...');
    
    // Vérifier les permissions audio
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'microphone' }).then(result => {
        console.log('🎤 Permission microphone:', result.state);
      });
    }
    
    // Vérifier le support audio
    const audio = new Audio();
    console.log('🎵 Support audio:', {
      canPlayType: audio.canPlayType('audio/mpeg'),
      hasAudio: 'Audio' in window,
      hasWebAudio: 'AudioContext' in window || 'webkitAudioContext' in window
    });
  }
}

// Exécuter les fonctions
detectMobileIssues();
forceUpdateServiceWorker();

// Exposer les fonctions globalement pour le debug
window.forceUpdateServiceWorker = forceUpdateServiceWorker;
window.detectMobileIssues = detectMobileIssues;

console.log('🔧 Script terminé - Fonctions exposées globalement'); 