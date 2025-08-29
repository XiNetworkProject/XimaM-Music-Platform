# 🚀 Guide de Migration MongoDB → Supabase

## 📋 Vue d'ensemble

Ce guide vous accompagne dans la migration complète de votre application XimaM de MongoDB vers Supabase, une solution PostgreSQL moderne et gratuite offrant :

- **8GB de base de données** gratuitement
- **1GB de stockage de fichiers** gratuitement  
- **50,000 lignes par mois** gratuitement
- **API REST et GraphQL** automatiques
- **Authentification intégrée** avec NextAuth
- **Temps réel** avec WebSockets
- **Sécurité avancée** avec RLS (Row Level Security)

## 🎯 Avantages de la Migration

### Avantages Supabase
✅ **Performance** : PostgreSQL est plus rapide que MongoDB pour les requêtes complexes  
✅ **Relations** : Gestion native des relations entre tables  
✅ **SQL** : Langage standard et puissant  
✅ **Gratuit** : 8GB vs MongoDB Atlas (512MB gratuit)  
✅ **Sécurité** : RLS intégré  
✅ **API** : REST et GraphQL automatiques  
✅ **Temps réel** : WebSockets natifs  

### Inconvénients
❌ **Migration** : Nécessite une adaptation du code  
❌ **Apprentissage** : Nouvelle syntaxe SQL  
❌ **Complexité** : Plus structuré que MongoDB  

## 🔧 Étapes de Migration

### Étape 1 : Création du Projet Supabase

1. **Aller sur [supabase.com](https://supabase.com)**
2. **Créer un compte gratuit**
3. **Créer un nouveau projet**
4. **Noter les informations de connexion :**
   - URL du projet
   - Clé anonyme (anon key)
   - Clé de service (service role key)

### Étape 2 : Configuration des Variables d'Environnement

Ajouter dans votre fichier `.env.local` :

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=votre_url_projet
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_cle_anonyme
SUPABASE_SERVICE_ROLE_KEY=votre_cle_service

# Garder MongoDB temporairement pour la migration
MONGODB_URI=votre_uri_mongodb
```

### Étape 3 : Création du Schéma de Base de Données

1. **Aller dans l'éditeur SQL de Supabase**
2. **Copier et exécuter le contenu de `scripts/supabase-schema.sql`**
3. **Vérifier que toutes les tables sont créées**

### Étape 4 : Migration des Données

1. **Installer les dépendances :**
   ```bash
   npm install @supabase/supabase-js @supabase/ssr uuid @types/uuid
   ```

2. **Exécuter le script de migration :**
   ```bash
   node scripts/migrate-to-supabase.js
   ```

3. **Vérifier la migration dans Supabase Dashboard**

### Étape 5 : Adaptation du Code

#### Remplacer les Imports MongoDB

**Avant (MongoDB) :**
```typescript
import User from '@/models/User';
import Track from '@/models/Track';
```

**Après (Supabase) :**
```typescript
import { UserService, TrackService } from '@/lib/supabaseService';
```

#### Adapter les Requêtes

**Avant (MongoDB) :**
```typescript
const user = await User.findById(userId);
const tracks = await Track.find({ creator: userId });
```

**Après (Supabase) :**
```typescript
const user = await UserService.getProfile(userId);
const tracks = await TrackService.getTracksByCreator(userId);
```

#### Adapter l'Authentification

**Avant (NextAuth + MongoDB) :**
```typescript
// Dans lib/authOptions.ts
import User from '@/models/User';
```

**Après (NextAuth + Supabase) :**
```typescript
// Dans lib/authOptions.ts
import { supabase } from '@/lib/supabase';
```

## 🔄 Migration des API Routes

### Exemple : API des Pistes

**Avant (MongoDB) :**
```typescript
// app/api/tracks/route.ts
import Track from '@/models/Track';

export async function GET() {
  const tracks = await Track.find({ isPublic: true });
  return Response.json(tracks);
}
```

**Après (Supabase) :**
```typescript
// app/api/tracks/route.ts
import { TrackService } from '@/lib/supabaseService';

export async function GET() {
  const tracks = await TrackService.getTrendingTracks();
  return Response.json(tracks);
}
```

### Exemple : API des Utilisateurs

**Avant (MongoDB) :**
```typescript
// app/api/users/[username]/route.ts
import User from '@/models/User';

export async function GET(
  request: Request,
  { params }: { params: { username: string } }
) {
  const user = await User.findOne({ username: params.username });
  return Response.json(user);
}
```

**Après (Supabase) :**
```typescript
// app/api/users/[username]/route.ts
import { supabase } from '@/lib/supabase';

export async function GET(
  request: Request,
  { params }: { params: { username: string } }
) {
  const { data: user, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', params.username)
    .single();

  if (error) return Response.json({ error: error.message }, { status: 404 });
  return Response.json(user);
}
```

## 🧪 Tests et Validation

### 1. **Test des Services Supabase**
```bash
# Créer un fichier de test
npm run dev
# Tester les fonctionnalités une par une
```

### 2. **Vérification des Données**
- Aller dans Supabase Dashboard
- Vérifier que toutes les tables contiennent les données
- Tester les requêtes SQL

### 3. **Test des Fonctionnalités**
- Authentification
- Création de pistes
- Système de likes
- Commentaires
- Messages
- Playlists

## 🚨 Gestion des Erreurs

### Erreurs Courantes

1. **Clés d'API manquantes**
   - Vérifier les variables d'environnement
   - Redémarrer le serveur après modification

2. **Tables manquantes**
   - Exécuter le script SQL complet
   - Vérifier les permissions RLS

3. **Erreurs de migration**
   - Vérifier la connexion MongoDB
   - Vérifier les permissions Supabase

### Rollback en Cas de Problème

Si la migration échoue :

1. **Garder MongoDB actif**
2. **Revertir les changements de code**
3. **Identifier et corriger le problème**
4. **Relancer la migration**

## 📊 Monitoring Post-Migration

### Métriques à Surveiller

- **Performance** : Temps de réponse des API
- **Erreurs** : Logs d'erreur dans Supabase
- **Utilisation** : Espace disque et requêtes
- **Fonctionnalités** : Tests utilisateur

### Optimisations Possibles

1. **Index** : Ajouter des index sur les colonnes fréquemment utilisées
2. **Requêtes** : Optimiser les requêtes complexes
3. **Cache** : Implémenter un système de cache
4. **Pagination** : Améliorer la pagination des résultats

## 🔒 Sécurité et Permissions

### RLS (Row Level Security)

Supabase utilise RLS pour la sécurité :

```sql
-- Exemple : Seuls les créateurs peuvent modifier leurs pistes
CREATE POLICY "Créateur peut modifier sa piste" 
ON tracks FOR UPDATE 
USING (auth.uid() = creator_id);
```

### Permissions par Table

- **profiles** : Lecture publique, modification par l'utilisateur
- **tracks** : Lecture publique, modification par le créateur
- **comments** : Lecture publique, modification par l'auteur
- **messages** : Lecture par les participants uniquement

## 💰 Coûts et Limites

### Plan Gratuit Supabase
- **Base de données** : 8GB
- **Stockage** : 1GB
- **Lignes** : 50,000/mois
- **Transfert** : 2GB/mois
- **Authentification** : 50,000 utilisateurs

### Plan Pro (25$/mois)
- **Base de données** : 100GB
- **Stockage** : 100GB
- **Lignes** : Illimitées
- **Transfert** : 250GB/mois
- **Support** : Prioritaire

## 🎉 Finalisation

### 1. **Suppression de MongoDB**
- Une fois la migration validée
- Supprimer les dépendances mongoose
- Nettoyer les variables d'environnement

### 2. **Mise à Jour de la Documentation**
- Mettre à jour le README
- Documenter les nouvelles API
- Ajouter des exemples d'utilisation

### 3. **Formation de l'Équipe**
- Former l'équipe à Supabase
- Documenter les bonnes pratiques
- Créer des guides de développement

## 📞 Support

### Ressources Utiles
- [Documentation Supabase](https://supabase.com/docs)
- [Forum Communautaire](https://github.com/supabase/supabase/discussions)
- [Discord Supabase](https://discord.supabase.com)

### En Cas de Problème
1. Vérifier la documentation officielle
2. Consulter le forum communautaire
3. Ouvrir une issue sur GitHub
4. Contacter le support Supabase (plan payant)

---

## 🚀 Prêt à Migrer ?

Suivez ce guide étape par étape pour une migration réussie vers Supabase. La migration vous apportera de meilleures performances, plus de flexibilité et une solution gratuite et évolutive pour votre application XimaM !

**Bon courage pour la migration ! 🎵✨**
