const fs = require('fs');
const path = require('path');

// Configuration de la migration
const migrationConfig = {
  // Fichiers à migrer
  files: [
    'app/page.tsx',
    'app/discover/page.tsx',
    'app/library/page.tsx',
    'app/profile/[username]/page.tsx',
    'app/community/page.tsx',
    'components/CommentSection.tsx'
  ],
  
  // Remplacements à effectuer
  replacements: [
    {
      // Remplacer InteractiveCounter par LikeButton
      pattern: /<InteractiveCounter\s+type="likes"([^>]*?)>/g,
      replacement: (match, props) => {
        // Extraire les props
        const initialCountMatch = props.match(/initialCount=\{([^}]+)\}/);
        const isActiveMatch = props.match(/isActive=\{([^}]+)\}/);
        const onToggleMatch = props.match(/onToggle=\{([^}]+)\}/);
        const sizeMatch = props.match(/size="([^"]+)"/);
        const classNameMatch = props.match(/className="([^"]+)"/);
        
        const initialCount = initialCountMatch ? initialCountMatch[1] : '0';
        const isActive = isActiveMatch ? isActiveMatch[1] : 'false';
        const size = sizeMatch ? sizeMatch[1] : 'md';
        const className = classNameMatch ? classNameMatch[1] : '';
        
        return `<LikeButton
          trackId={track._id}
          initialLikesCount={${initialCount}}
          initialIsLiked={${isActive}}
          size="${size}"
          variant="minimal"
          showCount={false}
          className="${className}"
        />`;
      }
    },
    
    {
      // Remplacer les imports InteractiveCounter
      pattern: /import InteractiveCounter from ['"]@\/components\/InteractiveCounter['"];?/g,
      replacement: 'import LikeButton from \'@/components/LikeButton\';'
    },
    
    {
      // Remplacer les anciens systèmes de plays
      pattern: /<PlaysCounter\s+trackId=\{([^}]+)\}\s+plays=\{([^}]+)\}/g,
      replacement: '<PlaysCounter trackId={$1} initialPlays={$2}'
    }
  ]
};

// Fonction pour migrer un fichier
function migrateFile(filePath) {
  console.log(`🔄 Migration de ${filePath}...`);
  
  try {
    const fullPath = path.join(process.cwd(), filePath);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`❌ Fichier non trouvé: ${filePath}`);
      return false;
    }
    
    let content = fs.readFileSync(fullPath, 'utf8');
    let hasChanges = false;
    
    // Appliquer les remplacements
    migrationConfig.replacements.forEach(({ pattern, replacement }) => {
      const newContent = content.replace(pattern, replacement);
      if (newContent !== content) {
        content = newContent;
        hasChanges = true;
      }
    });
    
    if (hasChanges) {
      // Sauvegarder le fichier original
      const backupPath = fullPath + '.backup';
      fs.writeFileSync(backupPath, fs.readFileSync(fullPath));
      console.log(`💾 Sauvegarde créée: ${backupPath}`);
      
      // Écrire le nouveau contenu
      fs.writeFileSync(fullPath, content);
      console.log(`✅ Migration réussie: ${filePath}`);
      return true;
    } else {
      console.log(`ℹ️  Aucun changement nécessaire: ${filePath}`);
      return false;
    }
    
  } catch (error) {
    console.error(`❌ Erreur lors de la migration de ${filePath}:`, error.message);
    return false;
  }
}

// Fonction principale
function runMigration() {
  console.log('🚀 Début de la migration des systèmes de likes et écoutes...\n');
  
  let successCount = 0;
  let totalCount = migrationConfig.files.length;
  
  migrationConfig.files.forEach(filePath => {
    if (migrateFile(filePath)) {
      successCount++;
    }
    console.log(''); // Ligne vide pour la lisibilité
  });
  
  console.log('📊 Résumé de la migration:');
  console.log(`✅ Fichiers migrés avec succès: ${successCount}/${totalCount}`);
  console.log(`❌ Échecs: ${totalCount - successCount}`);
  
  if (successCount === totalCount) {
    console.log('\n🎉 Migration terminée avec succès !');
    console.log('\n📝 Prochaines étapes:');
    console.log('1. Vérifier que tous les imports sont corrects');
    console.log('2. Tester les fonctionnalités de likes et écoutes');
    console.log('3. Vérifier que les nouveaux composants fonctionnent');
  } else {
    console.log('\n⚠️  Migration partielle. Vérifiez les fichiers en échec.');
  }
}

// Exécuter la migration si le script est appelé directement
if (require.main === module) {
  runMigration();
}

module.exports = { runMigration, migrateFile }; 