// Script pour tester la première lecture sur mobile
console.log('🎵 Test de la première lecture sur mobile...');

// Détecter si on est sur mobile
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
console.log('📱 Mobile détecté:', isMobile);

// Fonction pour tester la lecture audio
async function testFirstPlay() {
  try {
    console.log('🎵 Tentative de lecture audio...');
    
    // Créer un élément audio de test
    const testAudio = new Audio();
    testAudio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT';
    testAudio.volume = 0;
    
    // Tenter la lecture
    await testAudio.play();
    console.log('✅ Première lecture réussie !');
    
    // Arrêter immédiatement
    testAudio.pause();
    console.log('✅ Test terminé avec succès');
    
    return true;
  } catch (error) {
    console.log('❌ Erreur première lecture:', error);
    
    if (error.name === 'NotAllowedError') {
      console.log('📱 C\'est normal sur mobile - lecture automatique bloquée');
      console.log('💡 L\'utilisateur doit cliquer sur play pour activer l\'audio');
    }
    
    return false;
  }
}

// Fonction pour tester après interaction utilisateur
function testAfterInteraction() {
  console.log('🎵 Test après interaction utilisateur...');
  
  // Créer un bouton de test
  const testButton = document.createElement('button');
  testButton.textContent = '🎵 Test Audio';
  testButton.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
    padding: 10px;
    background: #1db954;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
  `;
  
  testButton.onclick = async () => {
    console.log('👆 Interaction utilisateur détectée');
    const success = await testFirstPlay();
    
    if (success) {
      testButton.style.background = '#28a745';
      testButton.textContent = '✅ Audio OK';
    } else {
      testButton.style.background = '#dc3545';
      testButton.textContent = '❌ Erreur Audio';
    }
    
    // Supprimer le bouton après 3 secondes
    setTimeout(() => {
      document.body.removeChild(testButton);
    }, 3000);
  };
  
  document.body.appendChild(testButton);
}

// Exécuter les tests
console.log('🚀 Démarrage des tests...');

// Test immédiat (va probablement échouer sur mobile)
testFirstPlay().then(success => {
  if (!success && isMobile) {
    console.log('📱 Test après interaction utilisateur...');
    testAfterInteraction();
  }
});

// Exposer les fonctions globalement
window.testFirstPlay = testFirstPlay;
window.testAfterInteraction = testAfterInteraction;

console.log('🔧 Script chargé - Utilisez testFirstPlay() ou testAfterInteraction() dans la console'); 