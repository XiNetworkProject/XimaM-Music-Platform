const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🎵 Configuration AudioCraft pour Synaura');
console.log('=====================================');

// Vérifier Python
function checkPython() {
  try {
    const pythonVersion = execSync('python --version', { encoding: 'utf8' });
    console.log('✅ Python détecté:', pythonVersion.trim());
    return true;
  } catch (error) {
    try {
      const python3Version = execSync('python3 --version', { encoding: 'utf8' });
      console.log('✅ Python3 détecté:', python3Version.trim());
      return true;
    } catch (error) {
      console.error('❌ Python non trouvé. Veuillez installer Python 3.8+');
      return false;
    }
  }
}

// Installer AudioCraft
function installAudioCraft() {
  console.log('📦 Installation d\'AudioCraft...');
  
  try {
    // Installer AudioCraft
    execSync('pip install audiocraft', { stdio: 'inherit' });
    console.log('✅ AudioCraft installé avec succès');
    
    // Installer les dépendances supplémentaires
    console.log('📦 Installation des dépendances supplémentaires...');
    execSync('pip install torch torchaudio', { stdio: 'inherit' });
    console.log('✅ PyTorch installé');
    
    execSync('pip install soundfile librosa', { stdio: 'inherit' });
    console.log('✅ Soundfile et Librosa installés');
    
    return true;
  } catch (error) {
    console.error('❌ Erreur lors de l\'installation:', error.message);
    return false;
  }
}

// Créer le script de génération AudioCraft
function createAudioCraftScript() {
  const scriptContent = `import torch
import torchaudio
import soundfile as sf
import numpy as np
from audiocraft.models import MusicGen
import os
import sys
import json

class SynauraAudioCraft:
    def __init__(self):
        self.model = None
        self.device = 'cuda' if torch.cuda.is_available() else 'cpu'
        print(f"🎵 AudioCraft initialisé sur {self.device}")
    
    def load_model(self, model_size='medium'):
        """Charge le modèle AudioCraft"""
        try:
            self.model = MusicGen.get_pretrained(model_size)
            self.model.set_generation_params(duration=30)
            print(f"✅ Modèle {model_size} chargé avec succès")
            return True
        except Exception as e:
            print(f"❌ Erreur chargement modèle: {e}")
            return False
    
    def generate_music(self, prompt, duration=30, output_path=None):
        """Génère de la musique à partir d'un prompt"""
        try:
            if self.model is None:
                if not self.load_model():
                    return None
            
            # Génération
            print(f"🎼 Génération: '{prompt}' ({duration}s)")
            wav = self.model.generate([prompt], duration=duration)
            
            # Conversion en numpy array
            audio = wav.squeeze().cpu().numpy()
            
            # Normalisation
            audio = audio / np.max(np.abs(audio))
            
            # Sauvegarde
            if output_path:
                sf.write(output_path, audio, 32000)
                print(f"💾 Audio sauvegardé: {output_path}")
            
            return audio
            
        except Exception as e:
            print(f"❌ Erreur génération: {e}")
            return None
    
    def generate_batch(self, prompts, duration=30, output_dir='outputs'):
        """Génère plusieurs musiques en lot"""
        os.makedirs(output_dir, exist_ok=True)
        results = []
        
        for i, prompt in enumerate(prompts):
            output_path = os.path.join(output_dir, f"generation_{i+1}.wav")
            audio = self.generate_music(prompt, duration, output_path)
            
            if audio is not None:
                results.append({
                    'prompt': prompt,
                    'output_path': output_path,
                    'duration': duration,
                    'success': True
                })
            else:
                results.append({
                    'prompt': prompt,
                    'output_path': None,
                    'duration': duration,
                    'success': False
                })
        
        return results

def main():
    """Fonction principale pour les tests"""
    generator = SynauraAudioCraft()
    
    # Test de génération
    test_prompts = [
        "Une chanson pop énergique avec guitare électrique",
        "Une mélodie jazz douce avec piano",
        "Un beat hip-hop avec batterie et basse"
    ]
    
    print("🧪 Tests de génération AudioCraft...")
    results = generator.generate_batch(test_prompts, duration=15)
    
    # Résultats
    print("\\n📊 Résultats des tests:")
    for result in results:
        status = "✅" if result['success'] else "❌"
        print(f"{status} {result['prompt']}")
        if result['success']:
            print(f"   📁 {result['output_path']}")

if __name__ == "__main__":
    main()
`;

  const scriptPath = path.join(__dirname, '..', 'lib', 'audiocraft_generator.py');
  
  // Créer le dossier lib s'il n'existe pas
  const libDir = path.dirname(scriptPath);
  if (!fs.existsSync(libDir)) {
    fs.mkdirSync(libDir, { recursive: true });
  }
  
  fs.writeFileSync(scriptPath, scriptContent);
  console.log('✅ Script AudioCraft créé:', scriptPath);
}

// Créer le fichier de configuration
function createConfig() {
  const configContent = `{
  "audiocraft": {
    "model_size": "medium",
    "default_duration": 30,
    "sample_rate": 32000,
    "device": "auto",
    "max_prompts_per_request": 1
  },
  "output": {
    "format": "wav",
    "quality": "high",
    "normalize": true
  },
  "limits": {
    "max_duration": 120,
    "min_duration": 10,
    "max_prompt_length": 500
  }
}`;

  const configPath = path.join(__dirname, '..', 'config', 'audiocraft.json');
  
  // Créer le dossier config s'il n'existe pas
  const configDir = path.dirname(configPath);
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  
  fs.writeFileSync(configPath, configContent);
  console.log('✅ Configuration AudioCraft créée:', configPath);
}

// Créer le dossier outputs
function createOutputsDir() {
  const outputsDir = path.join(__dirname, '..', 'outputs');
  if (!fs.existsSync(outputsDir)) {
    fs.mkdirSync(outputsDir, { recursive: true });
  }
  console.log('✅ Dossier outputs créé:', outputsDir);
}

// Test AudioCraft
function testAudioCraft() {
  console.log('🧪 Test d\'AudioCraft...');
  
  try {
    const testScript = `
import sys
sys.path.append('${path.join(__dirname, '..', 'lib')}')

try:
    from audiocraft_generator import SynauraAudioCraft
    generator = SynauraAudioCraft()
    if generator.load_model('medium'):
        print("✅ Test AudioCraft réussi")
    else:
        print("❌ Test AudioCraft échoué")
except Exception as e:
    print(f"❌ Erreur test: {e}")
`;

    const testPath = path.join(__dirname, 'test_audiocraft.py');
    fs.writeFileSync(testPath, testScript);
    
    execSync('python test_audiocraft.py', { stdio: 'inherit' });
    
    // Nettoyer
    fs.unlinkSync(testPath);
    
    return true;
  } catch (error) {
    console.error('❌ Test AudioCraft échoué:', error.message);
    return false;
  }
}

// Fonction principale
function main() {
  console.log('🚀 Début de la configuration AudioCraft...\n');
  
  // Vérifications
  if (!checkPython()) {
    process.exit(1);
  }
  
  // Installation
  if (!installAudioCraft()) {
    process.exit(1);
  }
  
  // Configuration
  createAudioCraftScript();
  createConfig();
  createOutputsDir();
  
  // Test
  if (testAudioCraft()) {
    console.log('\n🎉 Configuration AudioCraft terminée avec succès !');
    console.log('\n📋 Prochaines étapes :');
    console.log('   1. Intégrer le script dans l\'API');
    console.log('   2. Configurer Cloudinary pour l\'upload');
    console.log('   3. Tester la génération via l\'interface');
    console.log('   4. Optimiser les performances');
  } else {
    console.log('\n⚠️  Configuration terminée avec des avertissements');
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  main();
}

module.exports = { 
  checkPython, 
  installAudioCraft, 
  createAudioCraftScript, 
  createConfig, 
  testAudioCraft 
};
