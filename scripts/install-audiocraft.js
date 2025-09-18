#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🎵 Installation AudioCraft pour Synaura...\n');

async function checkPython() {
  return new Promise((resolve) => {
    const pythonProcess = spawn('python', ['--version']);
    
    pythonProcess.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Python détecté');
        resolve(true);
      } else {
        console.log('❌ Python non trouvé');
        resolve(false);
      }
    });
    
    pythonProcess.on('error', () => {
      console.log('❌ Python non trouvé');
      resolve(false);
    });
  });
}

async function checkPython3() {
  return new Promise((resolve) => {
    const pythonProcess = spawn('python3', ['--version']);
    
    pythonProcess.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Python3 détecté');
        resolve(true);
      } else {
        console.log('❌ Python3 non trouvé');
        resolve(false);
      }
    });
    
    pythonProcess.on('error', () => {
      console.log('❌ Python3 non trouvé');
      resolve(false);
    });
  });
}

async function installAudioCraft() {
  return new Promise((resolve) => {
    console.log('📦 Installation AudioCraft...');
    
    const pipProcess = spawn('pip', ['install', 'audiocraft']);
    
    pipProcess.stdout.on('data', (data) => {
      console.log(data.toString());
    });
    
    pipProcess.stderr.on('data', (data) => {
      console.log(data.toString());
    });
    
    pipProcess.on('close', (code) => {
      if (code === 0) {
        console.log('✅ AudioCraft installé avec succès');
        resolve(true);
      } else {
        console.log('❌ Erreur installation AudioCraft');
        resolve(false);
      }
    });
    
    pipProcess.on('error', (error) => {
      console.log('❌ Erreur exécution pip:', error.message);
      resolve(false);
    });
  });
}

async function installAudioCraftWithPip3() {
  return new Promise((resolve) => {
    console.log('📦 Installation AudioCraft avec pip3...');
    
    const pipProcess = spawn('pip3', ['install', 'audiocraft']);
    
    pipProcess.stdout.on('data', (data) => {
      console.log(data.toString());
    });
    
    pipProcess.stderr.on('data', (data) => {
      console.log(data.toString());
    });
    
    pipProcess.on('close', (code) => {
      if (code === 0) {
        console.log('✅ AudioCraft installé avec succès');
        resolve(true);
      } else {
        console.log('❌ Erreur installation AudioCraft');
        resolve(false);
      }
    });
    
    pipProcess.on('error', (error) => {
      console.log('❌ Erreur exécution pip3:', error.message);
      resolve(false);
    });
  });
}

async function testAudioCraft() {
  return new Promise((resolve) => {
    console.log('🧪 Test AudioCraft...');
    
    const testScript = `
import sys
try:
    from audiocraft.models import MusicGen
    print("SUCCESS")
except ImportError as e:
    print(f"ERROR: {e}")
`;
    
    const pythonProcess = spawn('python', ['-c', testScript]);
    
    let output = '';
    
    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    pythonProcess.on('close', (code) => {
      if (code === 0 && output.includes('SUCCESS')) {
        console.log('✅ AudioCraft fonctionne correctement');
        resolve(true);
      } else {
        console.log('❌ AudioCraft ne fonctionne pas:', output);
        resolve(false);
      }
    });
    
    pythonProcess.on('error', (error) => {
      console.log('❌ Erreur test AudioCraft:', error.message);
      resolve(false);
    });
  });
}

async function createRequirementsFile() {
  const requirements = `# Requirements pour AudioCraft
audiocraft>=1.0.0
torch>=2.0.0
torchaudio>=2.0.0
numpy>=1.21.0
`;

  const requirementsPath = path.join(process.cwd(), 'requirements.txt');
  
  try {
    fs.writeFileSync(requirementsPath, requirements);
    console.log('✅ Fichier requirements.txt créé');
    return true;
  } catch (error) {
    console.log('❌ Erreur création requirements.txt:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Début installation AudioCraft...\n');
  
  // Vérifier Python
  const hasPython = await checkPython();
  const hasPython3 = await checkPython3();
  
  if (!hasPython && !hasPython3) {
    console.log('\n❌ Python non trouvé. Veuillez installer Python 3.8+');
    console.log('📥 Téléchargez depuis: https://www.python.org/downloads/');
    process.exit(1);
  }
  
  // Créer requirements.txt
  await createRequirementsFile();
  
  // Installer AudioCraft
  let installed = false;
  
  if (hasPython) {
    installed = await installAudioCraft();
  }
  
  if (!installed && hasPython3) {
    installed = await installAudioCraftWithPip3();
  }
  
  if (!installed) {
    console.log('\n❌ Installation AudioCraft échouée');
    console.log('🔧 Essayez manuellement:');
    console.log('   pip install audiocraft');
    console.log('   ou');
    console.log('   pip3 install audiocraft');
    process.exit(1);
  }
  
  // Tester AudioCraft
  const tested = await testAudioCraft();
  
  if (!tested) {
    console.log('\n⚠️ AudioCraft installé mais test échoué');
    console.log('🔧 Vérifiez votre installation Python');
  } else {
    console.log('\n🎉 AudioCraft installé et configuré avec succès !');
    console.log('🎵 Vous pouvez maintenant générer de la musique avec l\'IA');
  }
  
  console.log('\n📋 Prochaines étapes:');
  console.log('   1. Redémarrez votre serveur de développement');
  console.log('   2. Testez la génération sur /ai-generator');
  console.log('   3. Profitez de la musique générée par IA !');
}

main().catch(console.error);
