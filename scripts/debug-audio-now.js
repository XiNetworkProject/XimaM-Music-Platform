// Debug immédiat du service audio
console.log('🔧 Debug immédiat du service audio...');

// Attendre que le service soit disponible
function waitForAudioService() {
  return new Promise((resolve) => {
    const checkService = () => {
      if (window.audioService) {
        console.log('✅ Service audio trouvé');
        resolve(window.audioService);
      } else {
        console.log('⏳ Attente du service audio...');
        setTimeout(checkService, 500);
      }
    };
    checkService();
  });
}

async function debugAudioNow() {
  try {
    console.log('🎵 Démarrage du debug audio...');
    
    // Attendre le service
    const audioService = await waitForAudioService();
    
    // Vérifier l'état initial
    console.log('📊 État initial:', {
      allTracksCount: audioService.allTracks?.length || 0,
      queueCount: audioService.queue?.length || 0,
      currentIndex: audioService.currentIndex,
      isPlaying: audioService.state?.isPlaying
    });
    
    // Si pas de pistes, les charger
    if (!audioService.allTracks || audioService.allTracks.length === 0) {
      console.log('📚 Chargement des pistes...');
      
      if (audioService.actions?.loadAllTracks) {
        await audioService.actions.loadAllTracks();
        
        // Attendre un peu et vérifier
        setTimeout(() => {
          console.log('📊 Après chargement:', {
            allTracksCount: audioService.allTracks?.length || 0,
            firstTrack: audioService.allTracks?.[0]?.title || 'Aucune'
          });
          
          // Tester la navigation si des pistes sont disponibles
          if (audioService.allTracks && audioService.allTracks.length > 0) {
            console.log('🧪 Test de navigation...');
            
            if (audioService.actions?.nextTrack) {
              console.log('▶️ Test nextTrack...');
              audioService.actions.nextTrack();
            }
            
            if (audioService.actions?.previousTrack) {
              console.log('⏮️ Test previousTrack...');
              audioService.actions.previousTrack();
            }
          }
        }, 2000);
      }
    } else {
      console.log('✅ Pistes déjà chargées, test navigation...');
      
      if (audioService.actions?.nextTrack) {
        console.log('▶️ Test nextTrack...');
        audioService.actions.nextTrack();
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur debug:', error);
  }
}

// Exposer la fonction
window.debugAudioNow = debugAudioNow;

// Auto-exécution
debugAudioNow();

console.log('🔧 Script de debug chargé');
console.log('📝 Utilisez debugAudioNow() pour relancer le debug'); 