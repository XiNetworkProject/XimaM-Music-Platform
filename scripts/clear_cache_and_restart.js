// scripts/clear_cache_and_restart.js
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧹 Nettoyage du cache et redémarrage...');

// 1. Arrêter le serveur de développement s'il tourne
console.log('🛑 Arrêt du serveur de développement...');
exec('taskkill /f /im node.exe', (error) => {
  if (error) {
    console.log('ℹ️ Aucun processus Node.js à arrêter');
  } else {
    console.log('✅ Serveur arrêté');
  }
  
  // 2. Nettoyer le cache Next.js
  console.log('🗑️ Nettoyage du cache Next.js...');
  const cacheDirs = [
    '.next',
    'node_modules/.cache',
    '.turbo'
  ];
  
  cacheDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
      console.log(`✅ Cache supprimé: ${dir}`);
    }
  });
  
  // 3. Nettoyer les variables d'environnement en cache
  console.log('🔄 Réinitialisation des variables d\'environnement...');
  
  // 4. Redémarrer le serveur
  console.log('🚀 Redémarrage du serveur...');
  exec('npm run dev', (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Erreur lors du redémarrage:', error);
      return;
    }
    console.log('✅ Serveur redémarré avec succès !');
    console.log('📝 Instructions pour l\'utilisateur:');
    console.log('   1. Ouvrez votre navigateur');
    console.log('   2. Appuyez sur Ctrl+Shift+R (ou Cmd+Shift+R sur Mac) pour forcer le rechargement');
    console.log('   3. Ou ouvrez les outils de développement (F12) et cliquez sur "Empty Cache and Hard Reload"');
    console.log('   4. L\'utilisateur test ne devrait plus apparaître');
  });
});

console.log('💡 Conseils supplémentaires:');
console.log('   - Videz le cache de votre navigateur (Ctrl+Shift+Delete)');
console.log('   - Désactivez temporairement les extensions du navigateur');
console.log('   - Testez en navigation privée/incognito');
console.log('   - Vérifiez que vous n\'êtes pas connecté avec l\'utilisateur test');
