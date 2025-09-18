# 🎵 Guide de Déploiement IA Complet - Synaura

## ✅ **Système de Génération IA avec Sauvegarde et Quotas**

Ce guide vous accompagne dans le déploiement complet du système de génération IA avec :
- ✅ **Sauvegarde automatique** des musiques générées
- ✅ **Gestion des quotas** mensuels par utilisateur
- ✅ **Bibliothèque personnelle** avec favoris et recherche
- ✅ **Statistiques d'utilisation** détaillées
- ✅ **Playlists IA** personnalisées
- ✅ **Intégration complète** avec le lecteur principal

## 🏗️ **Architecture du Système**

### **Base de Données**
```
ai_generations     # Générations principales
ai_tracks         # Tracks individuelles (2 par génération)
user_quotas       # Quotas mensuels des utilisateurs
ai_playlists      # Playlists personnalisées
ai_usage_stats    # Statistiques d'utilisation
ai_track_likes    # Likes sur les tracks
```

### **Services**
```
aiGenerationService.ts  # Service principal de gestion
useAIQuota.ts           # Hook pour les quotas
useSunoWaiter.ts        # Hook pour le suivi Suno
```

### **API Routes**
```
/api/ai/generate        # Génération de musique
/api/ai/quota          # Récupération du quota
/api/ai/quota/increment # Incrémentation du quota
/api/ai/library        # Bibliothèque utilisateur
/api/suno/callback     # Webhooks Suno
/api/suno/status       # Polling Suno
```

## 🚀 **Étapes de Déploiement**

### **1. Configuration des Variables d'Environnement**

Ajoutez dans votre `.env.local` :
```env
# Suno API
SUNO_API_BASE=https://api.sunoapi.org
SUNO_API_KEY=your_suno_api_key_here

# Supabase (déjà configuré)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret
```

### **2. Création des Tables de Base de Données**

#### **Option A : Script Automatique**
```bash
node scripts/run-ai-complete-migration.js
```

#### **Option B : Manuel dans Supabase**
1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet
3. Allez dans **SQL Editor**
4. Copiez-collez le contenu de `scripts/create_ai_generations_complete.sql`
5. Exécutez le script

### **3. Vérification de l'Installation**

```bash
# Test de la base de données
node scripts/run-ai-complete-migration.js
# Choisissez l'option 3 pour vérifier les tables

# Test de l'API Suno
node scripts/test-suno-integration.js

# Test du système complet
node scripts/test-complete-system.js
```

### **4. Test de l'Interface**

1. Démarrez l'application :
```bash
npm run dev
```

2. Testez les fonctionnalités :
   - Allez sur `http://localhost:3000/ai-generator`
   - Connectez-vous avec votre compte
   - Générez une musique
   - Vérifiez qu'elle apparaît dans `http://localhost:3000/ai-library`

## 📊 **Gestion des Quotas**

### **Plans Disponibles**
```typescript
const QUOTA_PLANS = {
  free: { limit: 5, price: 0 },
  basic: { limit: 50, price: 9.99 },
  pro: { limit: 200, price: 19.99 },
  enterprise: { limit: 1000, price: 49.99 }
};
```

### **Reset Mensuel**
- Les quotas se réinitialisent automatiquement le 1er de chaque mois
- Les utilisateurs reçoivent leur quota complet
- L'historique est conservé pour les statistiques

### **Gestion des Limites**
- Vérification automatique avant chaque génération
- Message d'erreur si quota épuisé
- Suggestion d'upgrade vers un plan supérieur

## 🎵 **Fonctionnalités Avancées**

### **Bibliothèque Personnelle**
- ✅ Affichage de toutes les générations
- ✅ Recherche par titre ou prompt
- ✅ Filtres (Tout, Favoris, Récent)
- ✅ Statistiques d'utilisation
- ✅ Intégration avec le lecteur principal

### **Gestion des Favoris**
- ✅ Marquer/démarquer comme favori
- ✅ Filtrage par favoris
- ✅ Compteur de favoris dans les stats

### **Téléchargement et Partage**
- ✅ Téléchargement direct des fichiers audio
- ✅ Partage via Web Share API
- ✅ Fallback vers copie de lien

### **Statistiques Détaillées**
- ✅ Nombre total de générations
- ✅ Durée totale de musique
- ✅ Nombre de favoris
- ✅ Activité récente (30 derniers jours)

## 🔧 **API Endpoints**

### **Génération**
```typescript
POST /api/ai/generate
{
  prompt: string,
  duration: number,
  style?: string,
  title?: string,
  lyrics?: string,
  isInstrumental?: boolean,
  model?: string
}
```

### **Quota**
```typescript
GET /api/ai/quota
// Retourne: { remaining, total, plan_type, reset_date }

POST /api/ai/quota/increment
// Incrémente le quota et vérifie les limites
```

### **Bibliothèque**
```typescript
GET /api/ai/library?limit=50&offset=0&search=query
// Retourne les générations de l'utilisateur
```

## 🎯 **Intégration avec l'Interface**

### **Page Générateur IA** (`/ai-generator`)
- ✅ Affichage du quota en temps réel
- ✅ Vérification automatique des limites
- ✅ Sauvegarde automatique des générations
- ✅ Suivi en temps réel du statut

### **Page Bibliothèque IA** (`/ai-library`)
- ✅ Liste de toutes les générations
- ✅ Recherche et filtres
- ✅ Actions (jouer, télécharger, partager)
- ✅ Statistiques personnelles

### **Intégration Lecteur**
- ✅ Les musiques IA s'intègrent au lecteur principal
- ✅ Préfixe `ai-` pour les identifier
- ✅ Artiste "Synaura IA"
- ✅ Genre "IA, Généré"

## 📈 **Monitoring et Analytics**

### **Logs à Surveiller**
```bash
# Console navigateur
🎵 Génération Suno initiée: taskId
📊 Status Suno: PENDING/FIRST_SUCCESS/SUCCESS
✅ Génération terminée !

# Console serveur
🔍 Polling Suno pour taskId: ...
📊 Status Suno: { status, tracks }
🎵 Suno callback reçu: { type, taskId, items }
✅ Génération mise à jour en base: taskId
```

### **Métriques Importantes**
- Nombre de générations par jour/mois
- Taux de succès des générations
- Utilisation des quotas par plan
- Temps moyen de génération
- Taux de conversion (gratuit → payant)

## 🔒 **Sécurité et Permissions**

### **Row Level Security (RLS)**
- ✅ Chaque utilisateur ne voit que ses propres générations
- ✅ Quotas isolés par utilisateur
- ✅ Playlists privées par défaut

### **Validation des Données**
- ✅ Vérification de l'authentification
- ✅ Validation des prompts (longueur, contenu)
- ✅ Limitation des durées (10-240 secondes)
- ✅ Sanitisation des entrées utilisateur

## 🚨 **Dépannage**

### **Erreurs Courantes**

#### **"Quota épuisé"**
```bash
# Vérifiez le quota utilisateur
curl -H "Authorization: Bearer token" /api/ai/quota
```

#### **"Génération échouée"**
```bash
# Vérifiez les logs Suno
node scripts/test-suno-integration.js
```

#### **"Tables non trouvées"**
```bash
# Exécutez la migration
node scripts/run-ai-complete-migration.js
```

### **Vérifications Système**
```bash
# Test complet du système
node scripts/test-complete-system.js

# Vérification des tables
node scripts/run-ai-complete-migration.js
# Option 3: Vérification des tables existantes
```

## 🎉 **Résultat Final**

Après le déploiement, vous aurez :

✅ **Système de génération IA complet** avec Suno API
✅ **Sauvegarde automatique** de toutes les musiques
✅ **Gestion des quotas** mensuels par utilisateur
✅ **Bibliothèque personnelle** avec recherche et filtres
✅ **Statistiques détaillées** d'utilisation
✅ **Intégration complète** avec le lecteur principal
✅ **Interface utilisateur** moderne et intuitive

## 📞 **Support**

En cas de problème :
1. Vérifiez les logs de l'application
2. Testez les endpoints API individuellement
3. Vérifiez la configuration Supabase
4. Consultez la documentation Suno API

**Le système est maintenant prêt pour la production !** 🚀
