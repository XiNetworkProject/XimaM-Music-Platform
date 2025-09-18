# 🎵 Guide de Déploiement - Système IA Synaura

## 📋 Vue d'Ensemble

Ce guide vous accompagne dans le déploiement complet du système de génération musicale IA pour Synaura, incluant AudioCraft, la base de données, et l'interface utilisateur.

## 🚀 Étapes de Déploiement

### 1. Prérequis Système

#### Python 3.8+
```bash
# Vérifier Python
python --version
# ou
python3 --version

# Si non installé, télécharger depuis python.org
```

#### Node.js 18+
```bash
# Vérifier Node.js
node --version

# Si non installé, télécharger depuis nodejs.org
```

#### Variables d'Environnement
Créer un fichier `.env.local` :
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=votre_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_clé_anon_supabase
SUPABASE_SERVICE_ROLE_KEY=votre_clé_service_supabase

# NextAuth
NEXTAUTH_SECRET=votre_secret_nextauth
NEXTAUTH_URL=http://localhost:3000

# Cloudinary (optionnel pour l'instant)
CLOUDINARY_CLOUD_NAME=votre_cloud_name
CLOUDINARY_API_KEY=votre_api_key
CLOUDINARY_API_SECRET=votre_api_secret
```

### 2. Installation des Dépendances

#### Dépendances Node.js
```bash
npm install
```

#### Dépendances Python (AudioCraft)
```bash
# Exécuter le script d'installation
node scripts/setup-audiocraft.js
```

Ou manuellement :
```bash
pip install audiocraft torch torchaudio soundfile librosa
```

### 3. Configuration de la Base de Données

#### Migration Supabase
```bash
# Exécuter la migration
node scripts/run-ai-migration.js
```

Ou manuellement via l'interface Supabase :
1. Aller dans l'éditeur SQL de Supabase
2. Copier le contenu de `scripts/create_ai_generations_table.sql`
3. Exécuter le script

#### Vérification de la Migration
```bash
# Tester la connexion
node scripts/test-ai-system.js
```

### 4. Configuration AudioCraft

#### Création des Dossiers
```bash
# Créer les dossiers nécessaires
mkdir -p lib config outputs
```

#### Script de Génération
Le script `lib/audiocraft_generator.py` est créé automatiquement par le script d'installation.

#### Test AudioCraft
```bash
# Test direct Python
python lib/audiocraft_generator.py

# Test via le service Node.js
node scripts/test-ai-system.js
```

### 5. Démarrage de l'Application

#### Mode Développement
```bash
npm run dev
```

#### Vérification des Endpoints
- **Interface** : http://localhost:3000/ai-generator
- **API Quota** : http://localhost:3000/api/ai/quota
- **API Génération** : http://localhost:3000/api/ai/generate

### 6. Tests Complets

#### Test Automatique
```bash
# Test complet du système
node scripts/test-ai-system.js
```

#### Test Manuel
1. Ouvrir http://localhost:3000/ai-generator
2. Se connecter avec un compte
3. Tester la génération d'une musique
4. Vérifier les quotas et l'historique

## 🔧 Configuration Avancée

### Optimisation AudioCraft

#### Modèle Plus Grand
```python
# Dans lib/audiocraft_generator.py
self.model = MusicGen.get_pretrained('large')  # Au lieu de 'medium'
```

#### GPU Acceleration
```python
# Vérifier CUDA
import torch
print(f"CUDA disponible: {torch.cuda.is_available()}")
print(f"Device: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'CPU'}")
```

### Configuration Cloudinary

#### Upload Audio
```typescript
// Dans lib/cloudinary.ts
export async function uploadAudio(audioBuffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        resource_type: 'video', // Pour l'audio
        format: 'mp3',
        folder: 'ai_generations'
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result!.secure_url);
      }
    ).end(audioBuffer);
  });
}
```

### Monitoring et Logs

#### Logs AudioCraft
```typescript
// Dans lib/audiocraftService.ts
console.log(`🎵 Génération: ${prompt} (${duration}s) - Device: ${device}`);
```

#### Métriques de Performance
```typescript
// Ajouter des métriques
const startTime = Date.now();
const result = await audioCraftService.generateMusic(request);
const duration = Date.now() - startTime;
console.log(`⏱️ Génération terminée en ${duration}ms`);
```

## 🚨 Dépannage

### Problèmes Courants

#### 1. Python Non Trouvé
```bash
# Solution : Ajouter Python au PATH
export PATH="/usr/local/bin:$PATH"
# ou installer Python depuis python.org
```

#### 2. AudioCraft Installation Échoue
```bash
# Solution : Installer les dépendances système
# Ubuntu/Debian
sudo apt-get install python3-dev build-essential

# macOS
xcode-select --install

# Windows
# Installer Visual Studio Build Tools
```

#### 3. Erreur CUDA
```bash
# Solution : Installer PyTorch avec CUDA
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu118
```

#### 4. Erreur Base de Données
```bash
# Vérifier les variables d'environnement
echo $NEXT_PUBLIC_SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY

# Vérifier la connexion
node scripts/test-ai-system.js
```

#### 5. Erreur API
```bash
# Vérifier les logs
npm run dev

# Tester les endpoints
curl http://localhost:3000/api/ai/quota
```

### Logs Détaillés

#### Activer les Logs Debug
```typescript
// Dans lib/audiocraftService.ts
const DEBUG = process.env.NODE_ENV === 'development';
if (DEBUG) console.log('🔍 Debug:', { prompt, duration, device });
```

#### Logs Supabase
```typescript
// Dans les API routes
console.log('📊 DB Query:', { userId, plan, usage });
```

## 📊 Monitoring Production

### Métriques à Surveiller

#### Performance
- Temps de génération moyen
- Utilisation CPU/GPU
- Taille des fichiers générés

#### Utilisation
- Nombre de générations par jour
- Quotas utilisateurs
- Taux de conversion

#### Erreurs
- Échecs de génération
- Erreurs de base de données
- Timeouts API

### Alertes Recommandées

```typescript
// Exemple d'alerte
if (generationTime > 30000) { // 30s
  console.error('⚠️ Génération lente:', generationTime);
  // Envoyer alerte Slack/Email
}
```

## 🔒 Sécurité

### Bonnes Pratiques

#### Validation des Entrées
```typescript
// Valider les prompts
if (prompt.length > 500) {
  throw new Error('Prompt trop long');
}

// Valider la durée
if (duration < 10 || duration > 120) {
  throw new Error('Durée invalide');
}
```

#### Rate Limiting
```typescript
// Limiter les requêtes par utilisateur
const rateLimit = new Map();
const maxRequests = 10; // par minute
```

#### Sanitisation
```typescript
// Nettoyer les prompts
const sanitizedPrompt = prompt.replace(/[<>]/g, '');
```

## 🚀 Déploiement Production

### Vercel (Recommandé)

#### Configuration
```json
// vercel.json
{
  "functions": {
    "app/api/ai/generate/route.ts": {
      "maxDuration": 60
    }
  },
  "env": {
    "PYTHONPATH": "./lib"
  }
}
```

#### Variables d'Environnement
- Configurer toutes les variables dans Vercel
- Utiliser des clés de production pour Supabase

### Docker (Alternative)

#### Dockerfile
```dockerfile
FROM node:18-alpine
RUN apk add --no-cache python3 py3-pip
COPY . .
RUN npm install
RUN pip install audiocraft torch torchaudio
EXPOSE 3000
CMD ["npm", "start"]
```

## 📈 Optimisations Futures

### Performance
- Cache Redis pour les générations
- CDN pour les fichiers audio
- Load balancing pour les serveurs IA

### Fonctionnalités
- Génération par lots
- Styles musicaux prédéfinis
- Collaboration en temps réel
- Marketplace de créations

### IA Avancée
- Modèles personnalisés
- Apprentissage des préférences
- Génération conditionnelle
- Remix automatique

## 📞 Support

### Ressources
- [Documentation AudioCraft](https://github.com/facebookresearch/audiocraft)
- [Documentation Supabase](https://supabase.com/docs)
- [Documentation Next.js](https://nextjs.org/docs)

### Contact
- Issues GitHub : [Repository Synaura]
- Email : support@synaura.com
- Discord : [Serveur Communauté]

---

**🎉 Félicitations ! Votre système IA Synaura est maintenant opérationnel !**

N'oubliez pas de :
- Tester régulièrement le système
- Surveiller les performances
- Mettre à jour les dépendances
- Sauvegarder la base de données
