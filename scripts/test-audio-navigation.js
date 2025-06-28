// Script de test pour la navigation audio
console.log('🎵 Test de navigation audio...');

// Fonction pour tester la navigation
async function testAudioNavigation() {
  try {
    console.log('🔍 Vérification du service audio...');
    
    // Vérifier si le service audio est disponible
    if (typeof window !== 'undefined' && window.audioService) {
      console.log('✅ Service audio trouvé');
      
      // Vérifier les pistes disponibles
      const allTracks = window.audioService.allTracks || [];
      console.log(`📚 Pistes disponibles: ${allTracks.length}`);
      
      if (allTracks.length === 0) {
        console.log('⚠️ Aucune piste disponible, chargement...');
        
        // Charger les pistes depuis l'API
        const response = await fetch('/api/tracks');
        if (response.ok) {
          const tracks = await response.json();
          console.log(`✅ ${tracks.length} pistes chargées depuis l'API`);
          
          // Mettre à jour le service audio
          if (window.audioService.actions && window.audioService.actions.setAllTracks) {
            window.audioService.actions.setAllTracks(tracks);
            console.log('✅ Pistes mises à jour dans le service audio');
          }
        } else {
          console.error('❌ Erreur chargement pistes:', response.status);
        }
      }
      
      // Tester la navigation
      console.log('🧪 Test de navigation...');
      
      if (window.audioService.actions && window.audioService.actions.nextTrack) {
        console.log('▶️ Test bouton suivant...');
        window.audioService.actions.nextTrack();
      }
      
      if (window.audioService.actions && window.audioService.actions.previousTrack) {
        console.log('⏮️ Test bouton précédent...');
        window.audioService.actions.previousTrack();
      }
      
    } else {
      console.log('❌ Service audio non trouvé');
      
      // Essayer d'accéder via le provider
      if (window.audioPlayer) {
        console.log('✅ Provider audio trouvé');
        
        const { nextTrack, previousTrack, audioState } = window.audioPlayer;
        
        console.log('📊 État actuel:', {
          tracks: audioState.tracks.length,
          currentTrack: audioState.currentTrackIndex,
          isPlaying: audioState.isPlaying
        });
        
        if (nextTrack) {
          console.log('▶️ Test bouton suivant via provider...');
          nextTrack();
        }
        
        if (previousTrack) {
          console.log('⏮️ Test bouton précédent via provider...');
          previousTrack();
        }
      } else {
        console.log('❌ Provider audio non trouvé');
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur test navigation:', error);
  }
}

// Fonction pour exposer le service audio globalement
function exposeAudioService() {
  if (typeof window !== 'undefined') {
    // Essayer de récupérer le service audio depuis le provider
    const audioElements = document.querySelectorAll('[data-audio-service]');
    if (audioElements.length > 0) {
      console.log('🔍 Éléments audio trouvés:', audioElements.length);
    }
    
    // Exposer les fonctions de test
    window.testAudioNavigation = testAudioNavigation;
    window.exposeAudioService = exposeAudioService;
    
    console.log('✅ Fonctions de test exposées');
    console.log('📝 Utilisez: testAudioNavigation() pour tester');
  }
}

// Exposer immédiatement
exposeAudioService();

// Auto-test après un délai
setTimeout(() => {
  console.log('🔄 Auto-test de navigation...');
  testAudioNavigation();
}, 2000);

console.log('🎵 Script de test audio chargé');
console.log('📝 Utilisez testAudioNavigation() pour tester manuellement'); 