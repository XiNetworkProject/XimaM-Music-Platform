const fs = require('fs');
const path = require('path');

// Fonction pour lire récursivement tous les fichiers
function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);
  
  files.forEach(file => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      arrayOfFiles.push(fullPath);
    }
  });
  
  return arrayOfFiles;
}

// Fonction pour corriger les interfaces
function fixInterfaces() {
  console.log('🔧 Correction des interfaces...');
  
  const appDir = path.join(__dirname, '..', 'app');
  const files = getAllFiles(appDir);
  
  let fixedFiles = 0;
  
  files.forEach(file => {
    if (file.includes('node_modules') || file.includes('.next')) return;
    
    let content = fs.readFileSync(file, 'utf8');
    let modified = false;
    
    // Remplacer les interfaces locales par des imports
    if (content.includes('interface User {')) {
      console.log(`📝 Correction User dans: ${path.relative(process.cwd(), file)}`);
      content = content.replace(/interface User \{[\s\S]*?\}/g, "import { User } from '@/types';");
      modified = true;
    }
    
    if (content.includes('interface Track {')) {
      console.log(`📝 Correction Track dans: ${path.relative(process.cwd(), file)}`);
      content = content.replace(/interface Track \{[\s\S]*?\}/g, "import { Track } from '@/types';");
      modified = true;
    }
    
    if (content.includes('interface Playlist {')) {
      console.log(`📝 Correction Playlist dans: ${path.relative(process.cwd(), file)}`);
      content = content.replace(/interface Playlist \{[\s\S]*?\}/g, "import { Playlist } from '@/types';");
      modified = true;
    }
    
    if (modified) {
      fs.writeFileSync(file, content);
      fixedFiles++;
    }
  });
  
  console.log(`✅ ${fixedFiles} fichiers corrigés`);
}

// Fonction pour vérifier les incohérences
function checkInconsistencies() {
  console.log('\n🔍 Vérification des incohérences...');
  
  const appDir = path.join(__dirname, '..', 'app');
  const files = getAllFiles(appDir);
  
  const issues = [];
  
  files.forEach(file => {
    if (file.includes('node_modules') || file.includes('.next')) return;
    
    const content = fs.readFileSync(file, 'utf8');
    
    // Vérifier les interfaces locales
    if (content.includes('interface User {') || 
        content.includes('interface Track {') || 
        content.includes('interface Playlist {')) {
      issues.push(`❌ Interface locale dans: ${path.relative(process.cwd(), file)}`);
    }
    
    // Vérifier les types any
    const anyMatches = content.match(/:\s*any/g);
    if (anyMatches && anyMatches.length > 5) {
      issues.push(`⚠️ Beaucoup de types 'any' dans: ${path.relative(process.cwd(), file)} (${anyMatches.length})`);
    }
  });
  
  if (issues.length > 0) {
    console.log('Problèmes détectés:');
    issues.forEach(issue => console.log(issue));
  } else {
    console.log('✅ Aucune incohérence majeure détectée');
  }
}

// Exécuter les corrections
try {
  fixInterfaces();
  checkInconsistencies();
  console.log('\n🎉 Analyse terminée !');
} catch (error) {
  console.error('❌ Erreur:', error.message);
} 