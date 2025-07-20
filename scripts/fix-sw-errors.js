// Script pour diagnostiquer et corriger les erreurs de Service Worker
// À exécuter dans la console du navigateur

console.log('🔧 Script de diagnostic Service Worker démarré...');

// Fonction pour nettoyer complètement les SW et caches
function cleanServiceWorker() {
  console.log('🧹 Nettoyage complet du Service Worker...');
  
  if ('serviceWorker' in navigator) {
    // Désenregistrer tous les SW
    navigator.serviceWorker.getRegistrations().then(registrations => {
      console.log(`📋 ${registrations.length} Service Worker(s) trouvé(s)`);
      
      registrations.forEach(registration => {
        console.log('🗑️ Désenregistrement:', registration.scope);
        registration.unregister();
      });
      
      // Nettoyer les caches
      if ('caches' in window) {
        caches.keys().then(cacheNames => {
          console.log(`🗂️ ${cacheNames.length} cache(s) trouvé(s)`);
          
          cacheNames.forEach(cacheName => {
            console.log('🗑️ Suppression du cache:', cacheName);
            caches.delete(cacheName);
          });
          
          console.log('✅ Nettoyage terminé, rechargement dans 2 secondes...');
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        });
      }
    });
  } else {
    console.log('❌ Service Worker non supporté');
  }
}

// Fonction pour diagnostiquer les problèmes
function diagnoseServiceWorker() {
  console.log('🔍 Diagnostic du Service Worker...');
  
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(registration => {
      console.log('✅ Service Worker prêt:', registration.scope);
      console.log('📊 État:', registration.active ? 'Actif' : 'Inactif');
      
      // Vérifier les caches
      if ('caches' in window) {
        caches.keys().then(cacheNames => {
          console.log('🗂️ Caches disponibles:', cacheNames);
        });
      }
    }).catch(error => {
      console.error('❌ Erreur Service Worker:', error);
    });
  } else {
    console.log('❌ Service Worker non supporté');
  }
}

// Fonction pour forcer la mise à jour
function forceUpdate() {
  console.log('🔄 Forçage de la mise à jour...');
  
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(registration => {
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        console.log('⏭️ Skip waiting envoyé');
      } else {
        console.log('ℹ️ Aucun SW en attente');
      }
    });
  }
}

// Fonction pour tester les ressources Next.js
function testNextResources() {
  console.log('🧪 Test des ressources Next.js...');
  
  const testUrls = [
    '/_next/static/css/app/layout.css',
    '/_next/static/chunks/webpack.js',
    '/_next/static/chunks/main-app.js'
  ];
  
  testUrls.forEach(url => {
    fetch(url)
      .then(response => {
        console.log(`✅ ${url}: ${response.status}`);
      })
      .catch(error => {
        console.error(`❌ ${url}: ${error.message}`);
      });
  });
}

// Exposer les fonctions globalement
window.cleanServiceWorker = cleanServiceWorker;
window.diagnoseServiceWorker = diagnoseServiceWorker;
window.forceUpdate = forceUpdate;
window.testNextResources = testNextResources;

console.log('📋 Fonctions disponibles:');
console.log('- cleanServiceWorker() : Nettoyer complètement SW et caches');
console.log('- diagnoseServiceWorker() : Diagnostiquer les problèmes');
console.log('- forceUpdate() : Forcer la mise à jour');
console.log('- testNextResources() : Tester les ressources Next.js');

// Diagnostic automatique
diagnoseServiceWorker(); 