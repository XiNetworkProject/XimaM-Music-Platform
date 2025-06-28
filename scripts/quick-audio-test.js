// Test rapide du chargement des pistes
console.log('🎵 Test rapide du chargement des pistes...');

async function quickTest() {
  try {
    // Test 1: Vérifier l'API directement
    console.log('🔍 Test 1: Vérification de l\'API...');
    const response = await fetch('/api/tracks');
    console.log('📊 Status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('📊 Données API:', {
        type: typeof data,
        isArray: Array.isArray(data),
        hasTracks: data && Array.isArray(data.tracks),
        tracksCount: data?.tracks?.length || 0,
        sample: data?.tracks?.[0]?.title || 'Aucune'
      });
    } else {
      console.error('❌ Erreur API:', response.status);
    }
    
    // Test 2: Vérifier le service audio
    console.log('🔍 Test 2: Vérification du service audio...');
    if (window.audioService) {
      console.log('📊 Service audio:', {
        allTracksCount: window.audioService.allTracks?.length || 0,
        hasLoadAllTracks: typeof window.audioService.actions?.loadAllTracks === 'function',
        hasReloadAllTracks: typeof window.audioService.actions?.reloadAllTracks === 'function'
      });
      
      // Forcer le rechargement
      if (window.audioService.actions?.reloadAllTracks) {
        console.log('🔄 Forçage rechargement...');
        await window.audioService.actions.reloadAllTracks();
        
        // Vérifier après rechargement
        setTimeout(() => {
          console.log('📊 Après rechargement:', {
            allTracksCount: window.audioService.allTracks?.length || 0,
            firstTrack: window.audioService.allTracks?.[0]?.title || 'Aucune'
          });
        }, 1000);
      }
    } else {
      console.log('❌ Service audio non disponible');
    }
    
    // Test 3: Tester la navigation
    console.log('🔍 Test 3: Test de navigation...');
    if (window.audioService?.allTracks?.length > 0) {
      console.log('✅ Pistes disponibles, test navigation...');
      
      if (window.audioService.actions?.nextTrack) {
        console.log('▶️ Test nextTrack...');
        window.audioService.actions.nextTrack();
      }
    } else {
      console.log('❌ Pas de pistes pour tester la navigation');
    }
    
  } catch (error) {
    console.error('❌ Erreur test:', error);
  }
}

// Exposer la fonction
window.quickTest = quickTest;

// Auto-test après 2 secondes
setTimeout(quickTest, 2000);

console.log('🎵 Script de test rapide chargé');
console.log('📝 Utilisez quickTest() pour tester manuellement'); 