const fs = require('fs');
const path = require('path');

function finalVerification() {
  console.log('🔍 Vérification finale...');
  
  const appDir = path.join(__dirname, '..', 'app');
  const files = getAllFiles(appDir);
  
  const issues = [];
  const goodFiles = [];
  
  files.forEach(file => {
    if (file.includes('node_modules') || file.includes('.next')) return;
    
    const content = fs.readFileSync(file, 'utf8');
    const relativePath = path.relative(process.cwd(), file);
    
    // Vérifier les interfaces locales
    if (content.includes('interface User {') || 
        content.includes('interface Track {') || 
        content.includes('interface Playlist {')) {
      issues.push(`❌ Interface locale: ${relativePath}`);
    } else if (content.includes("from '@/types'")) {
      goodFiles.push(`✅ ${relativePath}`);
    }
  });
  
  console.log('\n📊 Résumé:');
  console.log(`✅ Fichiers corrects: ${goodFiles.length}`);
  console.log(`❌ Problèmes: ${issues.length}`);
  
  if (issues.length > 0) {
    console.log('\n❌ Problèmes:');
    issues.forEach(issue => console.log(`  ${issue}`));
  } else {
    console.log('\n🎉 Tout est cohérent !');
  }
}

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

try {
  finalVerification();
  console.log('\n🎉 Terminé !');
} catch (error) {
  console.error('❌ Erreur:', error.message);
} 