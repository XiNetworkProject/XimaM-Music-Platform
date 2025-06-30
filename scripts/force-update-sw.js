// Script pour forcer la mise à jour du service worker
// Utile pour résoudre les problèmes de cache sur mobile

const fs = require('fs');
const path = require('path');

// Mettre à jour la version du cache dans le service worker
const swPath = path.join(__dirname, '../public/sw.js');
let swContent = fs.readFileSync(swPath, 'utf8');

// Incrémenter la version du cache
const versionMatch = swContent.match(/const CACHE_NAME = 'ximam-audio-v(\d+)'/);
if (versionMatch) {
  const currentVersion = parseInt(versionMatch[1]);
  const newVersion = currentVersion + 1;
  swContent = swContent.replace(
    /const CACHE_NAME = 'ximam-audio-v\d+'/,
    `const CACHE_NAME = 'ximam-audio-v${newVersion}'`
  );
  swContent = swContent.replace(
    /const AUDIO_CACHE_NAME = 'ximam-audio-files-v\d+'/,
    `const AUDIO_CACHE_NAME = 'ximam-audio-files-v${newVersion}'`
  );
  
  fs.writeFileSync(swPath, swContent);
  console.log(`✅ Service worker mis à jour vers la version ${newVersion}`);
} else {
  console.log('⚠️ Impossible de trouver la version du cache');
}

// Créer un script pour forcer la mise à jour côté client
const clientScript = `
// Script pour forcer la mise à jour du service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for(let registration of registrations) {
      registration.unregister();
    }
  });
  
  // Vider tous les caches
  if ('caches' in window) {
    caches.keys().then(function(names) {
      for (let name of names) {
        caches.delete(name);
      }
    });
  }
  
  // Recharger la page
  setTimeout(() => {
    window.location.reload(true);
  }, 1000);
}
`;

const clientScriptPath = path.join(__dirname, '../public/force-update.js');
fs.writeFileSync(clientScriptPath, clientScript);
console.log('✅ Script de mise à jour forcée créé');

console.log('\n📋 Instructions pour l\'utilisateur:');
console.log('1. Ouvrez la console du navigateur (F12)');
console.log('2. Exécutez: fetch("/force-update.js").then(r => r.text()).then(eval)');
console.log('3. Ou ajoutez cette ligne dans votre HTML: <script src="/force-update.js"></script>');

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