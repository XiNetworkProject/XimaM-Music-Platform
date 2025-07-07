# Guide des Interactions Sociales - XimaM

Ce guide explique comment utiliser les nouvelles fonctionnalités d'interactions sociales avec animations en temps réel dans l'application XimaM.

## 🎯 Fonctionnalités Implémentées

### ✅ Likes, Commentaires et Abonnements
- **Likes de pistes** : Animation avec particules et compteur en temps réel
- **Commentaires** : Système complet avec réponses et likes
- **Abonnements** : Suivre/ne plus suivre avec mise à jour instantanée
- **Animations fluides** : Transitions et effets visuels pour toutes les interactions

### ✅ Composants Créés

#### 1. InteractiveCounter
Compteur interactif avec animations pour likes, commentaires, abonnés, etc.

```tsx
import InteractiveCounter from '@/components/InteractiveCounter';

<InteractiveCounter
  type="likes"
  initialCount={track.likes.length}
  isActive={isLiked}
  onToggle={handleLike}
  size="md"
  showIcon={true}
/>
```

**Props :**
- `type` : 'likes' | 'comments' | 'followers' | 'following'
- `initialCount` : Nombre initial
- `isActive` : État actuel (liké, suivi, etc.)
- `onToggle` : Fonction appelée lors du clic
- `size` : 'sm' | 'md' | 'lg'
- `showIcon` : Afficher l'icône
- `disabled` : Désactiver l'interaction

#### 2. CommentSection
Section de commentaires complète avec réponses et likes.

```tsx
import CommentSection from '@/components/CommentSection';

<CommentSection
  trackId={track._id}
  initialComments={comments}
  onCommentAdded={handleCommentAdded}
/>
```

**Fonctionnalités :**
- Ajout de commentaires
- Réponses aux commentaires
- Likes de commentaires
- Pagination automatique
- Animations d'apparition

#### 3. SocialStats
Affichage des statistiques sociales avec interactions.

```tsx
import SocialStats from '@/components/SocialStats';

<SocialStats
  trackId={track._id}
  userId={user._id}
  initialStats={{
    likes: track.likes.length,
    comments: track.comments.length,
    followers: user.followerCount,
    following: user.followingCount
  }}
  size="md"
  showLabels={true}
/>
```

#### 4. TrackCard
Carte de piste avec interactions sociales intégrées.

```tsx
import TrackCard from '@/components/TrackCard';

<TrackCard
  track={track}
  showComments={true}
  showStats={true}
  size="md"
  onTrackUpdate={handleTrackUpdate}
/>
```

#### 5. UserProfileCard
Carte de profil utilisateur avec statistiques et actions.

```tsx
import UserProfileCard from '@/components/UserProfileCard';

<UserProfileCard
  user={userProfile}
  showActions={true}
  size="md"
  onProfileUpdate={handleProfileUpdate}
/>
```

### ✅ Hook Personnalisé

#### useSocialInteractions
Hook pour gérer toutes les interactions sociales.

```tsx
import { useSocialInteractions } from '@/hooks/useSocialInteractions';

const {
  stats,
  isLiked,
  isFollowing,
  isLoading,
  handleLike,
  handleFollow,
  addComment,
  updateStats,
  refreshStats
} = useSocialInteractions({
  trackId: track._id,
  userId: user._id,
  initialStats: {
    likes: track.likes.length,
    comments: track.comments.length
  },
  onStatsUpdate: handleStatsUpdate
});
```

## 🚀 API Routes Créées

### Likes de Pistes
- `POST /api/tracks/[id]/like` - Liker/unliker une piste

### Commentaires
- `POST /api/tracks/[id]/comments` - Ajouter un commentaire
- `GET /api/tracks/[id]/comments` - Récupérer les commentaires
- `POST /api/tracks/[id]/comments/[commentId]/replies` - Répondre à un commentaire
- `POST /api/tracks/[id]/comments/[commentId]/like` - Liker un commentaire

### Abonnements
- `POST /api/users/[username]/follow` - Suivre/ne plus suivre
- `GET /api/users/[username]/follow` - Vérifier l'état de suivi

## 🎨 Animations et Effets Visuels

### Animations de Likes
- Particules qui montent lors du like
- Animation de l'icône cœur
- Compteur qui "rebondit"
- Couleur qui change dynamiquement

### Animations de Commentaires
- Apparition progressive des commentaires
- Formulaire qui s'ouvre/se ferme en douceur
- Indicateur de chargement stylisé

### Animations d'Abonnements
- Bouton qui change d'état avec animation
- Compteur qui se met à jour en temps réel
- Effet de "pulse" lors du clic

## 📱 Utilisation dans les Pages

### Page Discover
```tsx
// Dans app/discover/page.tsx
import TrackCard from '@/components/TrackCard';

// Remplacer les anciennes cartes par :
{filteredTracks.map((track) => (
  <TrackCard
    key={track._id}
    track={track}
    showComments={false}
    showStats={true}
    onTrackUpdate={(updatedTrack) => {
      setTracks(prev => prev.map(t => 
        t._id === updatedTrack._id ? updatedTrack : t
      ));
    }}
  />
))}
```

### Page Profil
```tsx
// Dans app/profile/[username]/page.tsx
import UserProfileCard from '@/components/UserProfileCard';
import TrackCard from '@/components/TrackCard';

// Carte de profil
<UserProfileCard
  user={userProfile}
  onProfileUpdate={setUserProfile}
/>

// Liste des pistes
{userTracks.map((track) => (
  <TrackCard
    key={track._id}
    track={track}
    showComments={true}
    showStats={true}
  />
))}
```

## 🔧 Configuration

### Variables d'Environnement
Aucune configuration supplémentaire requise - toutes les API routes utilisent les configurations existantes.

### Dépendances
Les composants utilisent :
- `framer-motion` pour les animations
- `lucide-react` pour les icônes
- `next-auth` pour l'authentification

## 🎯 Exemples d'Utilisation

### Exemple Complet - Page de Piste
```tsx
'use client';

import { useState, useEffect } from 'react';
import { useSocialInteractions } from '@/hooks/useSocialInteractions';
import SocialStats from '@/components/SocialStats';
import CommentSection from '@/components/CommentSection';

export default function TrackPage({ trackId }: { trackId: string }) {
  const [track, setTrack] = useState(null);
  const [comments, setComments] = useState([]);

  const {
    stats,
    isLiked,
    isLoading,
    handleLike,
    addComment
  } = useSocialInteractions({
    trackId,
    initialStats: {
      likes: track?.likes?.length || 0,
      comments: track?.comments?.length || 0
    },
    onStatsUpdate: (newStats) => {
      setTrack(prev => ({ ...prev, ...newStats }));
    }
  });

  const handleCommentAdded = (comment) => {
    setComments(prev => [comment, ...prev]);
  };

  return (
    <div className="space-y-6">
      {/* Statistiques sociales */}
      <SocialStats
        trackId={trackId}
        initialStats={{
          likes: stats.likes,
          comments: stats.comments
        }}
        size="lg"
        showLabels={true}
      />

      {/* Section commentaires */}
      <CommentSection
        trackId={trackId}
        initialComments={comments}
        onCommentAdded={handleCommentAdded}
      />
    </div>
  );
}
```

## 🚀 Prochaines Étapes

1. **Notifications en temps réel** : WebSockets pour les notifications instantanées
2. **Partage social** : Intégration avec les réseaux sociaux
3. **Playlists collaboratives** : Permettre aux utilisateurs de collaborer
4. **Système de badges** : Récompenses pour l'engagement
5. **Analytics avancés** : Statistiques détaillées pour les artistes

## 🐛 Dépannage

### Problèmes Courants

1. **Animations qui ne fonctionnent pas**
   - Vérifier que `framer-motion` est installé
   - S'assurer que les composants sont dans un contexte client

2. **Compteurs qui ne se mettent pas à jour**
   - Vérifier que `onStatsUpdate` est bien passé
   - S'assurer que l'API route répond correctement

3. **Erreurs d'authentification**
   - Vérifier que l'utilisateur est connecté
   - S'assurer que les sessions sont valides

### Debug
Utiliser les outils de développement du navigateur pour :
- Vérifier les appels API dans l'onglet Network
- Surveiller les erreurs dans la console
- Inspecter les états des composants avec React DevTools

## 📞 Support

Pour toute question ou problème :
1. Vérifier ce guide
2. Consulter les logs de la console
3. Tester avec des données de test
4. Créer un ticket avec les détails du problème 