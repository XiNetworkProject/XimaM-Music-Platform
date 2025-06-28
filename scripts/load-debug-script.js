// Script pour charger le script de debug dans la console
console.log('🚀 Chargement du script de debug...');

// Créer un élément script
const script = document.createElement('script');
script.src = '/scripts/force-update-sw.js';
script.onload = () => {
  console.log('✅ Script de debug chargé avec succès');
  console.log('📝 Utilisez window.forceUpdateSW.main() pour démarrer');
};
script.onerror = () => {
  console.error('❌ Erreur lors du chargement du script');
};

// Ajouter le script au document
document.head.appendChild(script);

// Alternative : charger directement le contenu
fetch('/scripts/force-update-sw.js')
  .then(response => response.text())
  .then(code => {
    console.log('📜 Exécution directe du script...');
    eval(code);
  })
  .catch(error => {
    console.error('❌ Erreur chargement direct:', error);
  }); 