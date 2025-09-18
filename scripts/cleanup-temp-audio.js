const fs = require('fs');
const path = require('path');

function cleanupTempAudio() {
  console.log('🧹 Nettoyage des fichiers audio temporaires...\n');

  try {
    const tempDir = path.join(process.cwd(), 'public', 'temp');
    
    // Vérifier si le dossier existe
    if (!fs.existsSync(tempDir)) {
      console.log('✅ Dossier temp inexistant, rien à nettoyer');
      return;
    }

    // Lister tous les fichiers .wav
    const files = fs.readdirSync(tempDir).filter(file => file.endsWith('.wav'));
    
    if (files.length === 0) {
      console.log('✅ Aucun fichier audio temporaire trouvé');
      return;
    }

    console.log(`📁 ${files.length} fichiers audio temporaires trouvés:`);
    
    let deletedCount = 0;
    files.forEach(file => {
      const filePath = path.join(tempDir, file);
      try {
        fs.unlinkSync(filePath);
        console.log(`   🗑️ Supprimé: ${file}`);
        deletedCount++;
      } catch (error) {
        console.log(`   ⚠️ Impossible de supprimer: ${file}`);
      }
    });

    console.log(`\n✅ Nettoyage terminé: ${deletedCount}/${files.length} fichiers supprimés`);

  } catch (error) {
    console.error('❌ Erreur lors du nettoyage:', error);
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  cleanupTempAudio();
}

module.exports = { cleanupTempAudio };
