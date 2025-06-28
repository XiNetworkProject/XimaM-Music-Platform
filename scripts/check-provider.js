// Vérification du provider audio
console.log('🔍 Vérification du provider audio...');

// Fonction pour vérifier l'état global
function checkGlobalState() {
  console.log('📊 État global:');
  console.log('- window.audioService:', !!window.audioService);
  console.log('- window.audioPlayer:', !!window.audioPlayer);
  console.log('- window.audioService?.allTracks:', window.audioService?.allTracks?.length || 'undefined');
  console.log('- window.audioService?.actions:', !!window.audioService?.actions);
}

// Fonction pour tester l'API directement
async function testAPI() {
  console.log('🌐 Test de l\'API /api/tracks...');
  try {
    const response = await fetch('/api/tracks');
    console.log('📊 Status API:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('📊 Données API:', {
        type: typeof data,
        hasTracks: !!data.tracks,
        tracksCount: data.tracks?.length || 0,
        sample: data.tracks?.[0]?.title || 'Aucune'
      });
      return data;
    } else {
      console.error('❌ Erreur API:', response.status);
      return null;
    }
  } catch (error) {
    console.error('❌ Erreur fetch:', error);
    return null;
  }
}

// Fonction pour forcer l'exposition du service
function forceExposeService() {
  console.log('🔧 Tentative d\'exposition forcée...');
  
  // Chercher le provider dans le DOM
  const audioElements = document.querySelectorAll('[data-audio-provider]');
  console.log('🔍 Éléments audio trouvés:', audioElements.length);
  
  // Essayer d'accéder via React DevTools
  if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    console.log('🔧 React DevTools disponible');
  }
  
  // Vérifier si Next.js est chargé
  if (window.__NEXT_DATA__) {
    console.log('🔧 Next.js détecté');
  }
}

// Fonction pour créer un service de test
function createTestService() {
  console.log('🧪 Création d\'un service de test...');
  
  const testService = {
    allTracks: [],
    queue: [],
    state: { isPlaying: false },
    actions: {
      loadAllTracks: async () => {
        console.log('📚 Test: Chargement des pistes...');
        const data = await testAPI();
        if (data?.tracks) {
          testService.allTracks = data.tracks;
          console.log(`✅ Test: ${data.tracks.length} pistes chargées`);
        }
      },
      nextTrack: () => {
        console.log('▶️ Test: nextTrack appelé');
        if (testService.allTracks.length > 0) {
          const randomTrack = testService.allTracks[Math.floor(Math.random() * testService.allTracks.length)];
          console.log(`🎵 Test: Piste sélectionnée: ${randomTrack.title}`);
        } else {
          console.log('❌ Test: Aucune piste disponible');
        }
      },
      previousTrack: () => {
        console.log('⏮️ Test: previousTrack appelé');
        if (testService.allTracks.length > 0) {
          const randomTrack = testService.allTracks[Math.floor(Math.random() * testService.allTracks.length)];
          console.log(`🎵 Test: Piste sélectionnée: ${randomTrack.title}`);
        } else {
          console.log('❌ Test: Aucune piste disponible');
        }
      }
    }
  };
  
  // Exposer le service de test
  window.testAudioService = testService;
  console.log('✅ Service de test créé et exposé');
  
  return testService;
}

// Fonction principale
async function checkProvider() {
  console.log('🚀 Démarrage de la vérification...');
  
  // Vérifier l'état global
  checkGlobalState();
  
  // Tester l'API
  const apiData = await testAPI();
  
  // Essayer d'exposer le service
  forceExposeService();
  
  // Créer un service de test si nécessaire
  if (!window.audioService && apiData) {
    const testService = createTestService();
    await testService.actions.loadAllTracks();
  }
  
  console.log('✅ Vérification terminée');
  console.log('📝 Utilisez window.testAudioService pour tester manuellement');
}

// Exposer les fonctions
window.checkProvider = checkProvider;
window.checkGlobalState = checkGlobalState;
window.testAPI = testAPI;
window.createTestService = createTestService;

// Auto-exécution
setTimeout(checkProvider, 1000);

console.log('🔍 Script de vérification chargé');
console.log('📝 Utilisez checkProvider() pour relancer la vérification'); 