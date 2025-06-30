const fs = require('fs');
const path = require('path');

function verifyApiConsistency() {
  console.log('🔍 Vérification des APIs...');
  
  const apiDir = path.join(__dirname, '..', 'app', 'api');
  const files = getAllFiles(apiDir);
  
  const issues = [];
  const apis = [];
  
  files.forEach(file => {
    if (file.endsWith('route.ts')) {
      const content = fs.readFileSync(file, 'utf8');
      const relativePath = path.relative(process.cwd(), file);
      
      if (content.includes('NextResponse.json')) {
        apis.push(relativePath);
        
        if (content.includes('_id.toString()') && !content.includes('lean()')) {
          issues.push(`⚠️ ${relativePath}: _id.toString() sans lean()`);
        }
        
        if (content.includes('ObjectId') && !content.includes('toString()')) {
          issues.push(`⚠️ ${relativePath}: ObjectId non converti`);
        }
      }
    }
  });
  
  console.log('\n📊 APIs:');
  apis.forEach(api => console.log(`  ✅ ${api}`));
  
  if (issues.length > 0) {
    console.log('\n⚠️ Problèmes:');
    issues.forEach(issue => console.log(`  ${issue}`));
  } else {
    console.log('\n✅ Aucun problème détecté');
  }
}

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);
  
  files.forEach(file => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else if (file.endsWith('.ts')) {
      arrayOfFiles.push(fullPath);
    }
  });
  
  return arrayOfFiles;
}

try {
  verifyApiConsistency();
  console.log('\n🎉 Terminé !');
} catch (error) {
  console.error('❌ Erreur:', error.message);
} 