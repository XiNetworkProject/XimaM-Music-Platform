# 🔄 GUIDE BASCULEMENT COMPLET VERS SUPABASE

## 📋 **VUE D'ENSEMBLE**

Ce guide vous accompagne dans le **basculement complet** de votre application XimaM de MongoDB vers Supabase, après la migration des données.

## 🎯 **OBJECTIFS DU BASCULEMENT**

- ✅ **Remplacer MongoDB** par Supabase dans toute l'application
- ✅ **Adapter l'authentification** NextAuth pour Supabase
- ✅ **Mettre à jour tous les services** et hooks
- ✅ **Tester l'application** complète avec Supabase
- ✅ **Désactiver MongoDB** définitivement

## 🚀 **ÉTAPE 1 : AUTHENTIFICATION SUPABASE**

### **1.1 Remplacer authOptions.ts**

```typescript
// Remplacer lib/authOptions.ts par lib/authOptionsSupabase.ts
import { authOptionsSupabase } from '@/lib/authOptionsSupabase';

export const authOptions = authOptionsSupabase;
```

### **1.2 Mettre à jour les types NextAuth**

```typescript
// types/next-auth.d.ts
import { SupabaseUser } from '@/lib/supabaseServiceComplete';

declare module "next-auth" {
  interface User extends SupabaseUser {}
  interface Session {
    user: SupabaseUser;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends SupabaseUser {}
}
```

## 🔧 **ÉTAPE 2 : REMPLACER LES MODÈLES MONGODB**

### **2.1 Remplacer les imports**

```typescript
// AVANT (MongoDB)
import User from '@/models/User';
import Track from '@/models/Track';
import Comment from '@/models/Comment';

// APRÈS (Supabase)
import { userService, trackService, commentService } from '@/lib/supabaseServiceComplete';
```

### **2.2 Adapter les appels de base de données**

```typescript
// AVANT (MongoDB)
const user = await User.findById(userId);
const tracks = await Track.find({ creator: userId });

// APRÈS (Supabase)
const user = await userService.getById(userId);
const tracks = await trackService.getByCreator(userId);
```

## 📝 **ÉTAPE 3 : MISE À JOUR DES SERVICES API**

### **3.1 API Utilisateurs**

```typescript
// app/api/users/[username]/route.ts
import { userService } from '@/lib/supabaseServiceComplete';

export async function GET(request: Request, { params }: { params: { username: string } }) {
  try {
    const user = await userService.getByUsername(params.username);
    
    if (!user) {
      return Response.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }
    
    return Response.json(user);
  } catch (error) {
    return Response.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
```

### **3.2 API Pistes**

```typescript
// app/api/tracks/route.ts
import { trackService } from '@/lib/supabaseServiceComplete';

export async function GET(request: Request) {
  try {
    const tracks = await trackService.getRecent(20);
    return Response.json(tracks);
  } catch (error) {
    return Response.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
```

### **3.3 API Commentaires**

```typescript
// app/api/tracks/[id]/comments/route.ts
import { commentService } from '@/lib/supabaseServiceComplete';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const comments = await commentService.getByTrack(params.id);
    return Response.json(comments);
  } catch (error) {
    return Response.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const commentId = await commentService.create({
      content: body.content,
      user_id: body.userId,
      track_id: params.id,
      likes: 0
    });
    
    if (!commentId) {
      return Response.json({ error: 'Erreur création commentaire' }, { status: 500 });
    }
    
    return Response.json({ id: commentId });
  } catch (error) {
    return Response.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
```

## 🎵 **ÉTAPE 4 : MISE À JOUR DES HOOKS**

### **4.1 Hook useAuth**

```typescript
// hooks/useAuth.ts
import { useSession } from 'next-auth/react';
import { SupabaseUser } from '@/lib/supabaseServiceComplete';

export function useAuth() {
  const { data: session, status } = useSession();
  
  return {
    user: session?.user as SupabaseUser | null,
    isAuthenticated: !!session?.user,
    isLoading: status === 'loading',
    isArtist: session?.user?.is_artist || false,
    isVerified: session?.user?.is_verified || false,
  };
}
```

### **4.2 Hook useTracks**

```typescript
// hooks/useTracks.ts
import { useState, useEffect } from 'react';
import { trackService, SupabaseTrack } from '@/lib/supabaseServiceComplete';

export function useTracks(limit: number = 20) {
  const [tracks, setTracks] = useState<SupabaseTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTracks() {
      try {
        setLoading(true);
        const data = await trackService.getRecent(limit);
        setTracks(data);
      } catch (err) {
        setError('Erreur lors du chargement des pistes');
      } finally {
        setLoading(false);
      }
    }

    fetchTracks();
  }, [limit]);

  return { tracks, loading, error };
}
```

## 🔄 **ÉTAPE 5 : MISE À JOUR DES COMPOSANTS**

### **5.1 Composant TrackCard**

```typescript
// components/TrackCard.tsx
import { SupabaseTrack } from '@/lib/supabaseServiceComplete';

interface TrackCardProps {
  track: SupabaseTrack;
  onPlay?: (track: SupabaseTrack) => void;
}

export default function TrackCard({ track, onPlay }: TrackCardProps) {
  const handlePlay = () => {
    if (onPlay) {
      onPlay(track);
    }
  };

  return (
    <div className="track-card">
      <img src={track.cover_url} alt={track.title} />
      <h3>{track.title}</h3>
      <p>{track.artist}</p>
      <div className="track-stats">
        <span>🎵 {track.plays} écoutes</span>
        <span>❤️ {track.likes} likes</span>
      </div>
      <button onClick={handlePlay}>▶️ Écouter</button>
    </div>
  );
}
```

### **5.2 Composant UserProfile**

```typescript
// components/UserProfile.tsx
import { SupabaseUser } from '@/lib/supabaseServiceComplete';

interface UserProfileProps {
  user: SupabaseUser;
}

export default function UserProfile({ user }: UserProfileProps) {
  return (
    <div className="user-profile">
      <img src={user.avatar} alt={user.name} />
      <h2>{user.name}</h2>
      <p className="username">@{user.username}</p>
      {user.bio && <p className="bio">{user.bio}</p>}
      {user.is_artist && (
        <div className="artist-info">
          <h3>🎵 {user.artist_name}</h3>
          <p>Genre: {user.genre.join(', ')}</p>
        </div>
      )}
      <div className="stats">
        <span>🎵 {user.total_plays} écoutes</span>
        <span>❤️ {user.total_likes} likes</span>
      </div>
    </div>
  );
}
```

## 🧪 **ÉTAPE 6 : TESTS ET VÉRIFICATION**

### **6.1 Test de l'authentification**

```bash
# Démarrer l'application
npm run dev

# Tester la connexion avec un utilisateur migré
# Email: vermeulenmaxime50@gmail.com
# Mot de passe: [votre mot de passe existant]
```

### **6.2 Test des fonctionnalités**

- ✅ **Connexion/Déconnexion**
- ✅ **Affichage des profils utilisateurs**
- ✅ **Liste des pistes**
- ✅ **Lecture audio**
- ✅ **Commentaires**
- ✅ **Messages**

### **6.3 Vérification des données**

```bash
# Vérifier que toutes les données sont bien affichées
npm run compare:migration
```

## 🚨 **ÉTAPE 7 : GESTION DES ERREURS**

### **7.1 Erreurs courantes**

```typescript
// Erreur de connexion Supabase
if (error?.code === 'PGRST116') {
  console.error('Erreur de connexion Supabase');
}

// Erreur de permissions
if (error?.code === '42501') {
  console.error('Erreur de permissions Supabase');
}
```

### **7.2 Fallback MongoDB**

```typescript
// En cas de problème avec Supabase, garder MongoDB en backup
const useSupabase = process.env.USE_SUPABASE === 'true';

export async function getUserData(userId: string) {
  if (useSupabase) {
    try {
      return await userService.getById(userId);
    } catch (error) {
      console.warn('Fallback vers MongoDB');
      // Retourner à MongoDB temporairement
    }
  }
  
  // Utiliser MongoDB
  return await User.findById(userId);
}
```

## 🎯 **ÉTAPE 8 : FINALISATION**

### **8.1 Variables d'environnement**

```env
# Activer Supabase
USE_SUPABASE=true

# Désactiver MongoDB (optionnel)
MONGODB_URI=

# Supabase (déjà configuré)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

### **8.2 Nettoyage MongoDB**

```bash
# Supprimer les modèles MongoDB non utilisés
rm models/User.ts
rm models/Track.ts
rm models/Comment.ts
rm models/Playlist.ts
rm models/Message.ts
rm models/Conversation.ts
rm models/Subscription.ts
rm models/Payment.ts
rm models/UserStatus.ts
rm models/UserSubscription.ts

# Supprimer la connexion MongoDB
rm lib/db.ts
```

### **8.3 Mise à jour package.json**

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test:supabase": "node scripts/test-supabase-connection.js",
    "compare:migration": "node scripts/compare-migration-status.js"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.x.x",
    "next-auth": "^4.x.x"
  }
}
```

## 📊 **ÉTAPE 9 : MONITORING ET MAINTENANCE**

### **9.1 Logs Supabase**

- Surveiller les erreurs dans la console Supabase
- Vérifier les performances des requêtes
- Contrôler l'utilisation des ressources

### **9.2 Métriques de performance**

```typescript
// Ajouter des métriques de performance
export async function trackPerformance(operation: string, duration: number) {
  console.log(`⏱️ ${operation}: ${duration}ms`);
  
  // Envoyer à votre service de monitoring
  if (process.env.MONITORING_ENABLED === 'true') {
    // Envoyer les métriques
  }
}
```

## 🎉 **RÉSULTAT FINAL**

Après ce basculement, votre application XimaM sera **100% sur Supabase** avec :

- 🚀 **Performance PostgreSQL** pour toutes les opérations
- 🔐 **Authentification robuste** gérée par Supabase
- 📊 **8GB de stockage gratuit** avec possibilité d'extension
- 🔄 **Temps réel** intégré pour les fonctionnalités collaboratives
- 🛡️ **Sécurité** de niveau entreprise
- 📈 **Scalabilité** automatique

**Votre application sera plus rapide, plus sécurisée et plus évolutive !** 🎵✨

## 📞 **SUPPORT ET AIDE**

En cas de problème lors du basculement :

1. **Vérifier les logs** de l'application
2. **Contrôler la console** Supabase
3. **Tester les connexions** avec `npm run test:supabase`
4. **Consulter la documentation** Supabase
5. **Revenir temporairement** à MongoDB si nécessaire

**Le basculement vers Supabase est une étape majeure qui transformera votre application !** 🚀
