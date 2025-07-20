# Guide de Migration - Système de Likes Amélioré

## 🎯 **Vue d'ensemble**

Le nouveau système de likes a été conçu pour résoudre tous les problèmes de synchronisation et de cohérence dans l'application. Il offre :

- ✅ **Synchronisation globale** entre tous les composants
- ✅ **Gestion d'erreurs robuste** avec rollback automatique
- ✅ **Optimistic updates** avec feedback visuel
- ✅ **Cache intelligent** pour les performances
- ✅ **Notifications utilisateur** pour le feedback

## 🚀 **Composants Principaux**

### **1. Hook `useLikeSystem`**
```typescript
import { useLikeSystem } from '@/hooks/useLikeSystem';

const { isLiked, likesCount, isLoading, error, toggleLike } = useLikeSystem({
  trackId: 'track-id',
  initialLikesCount: 42,
  initialIsLiked: false,
  onUpdate: (state) => {
    // Callback appelé à chaque mise à jour
    console.log('Like state updated:', state);
  }
});
```

### **2. Composant `LikeButton`**
```typescript
import LikeButton from '@/components/LikeButton';

<LikeButton
  trackId="track-id"
  initialLikesCount={42}
  initialIsLiked={false}
  size="md"
  variant="default"
  showCount={true}
  onUpdate={(state) => {
    // Mise à jour de l'état parent
  }}
/>
```

### **3. Contexte Global `LikeContext`**
```typescript
import { useTrackLike } from '@/contexts/LikeContext';

const { isLiked, likesCount, hasCachedState } = useTrackLike(
  trackId,
  fallbackLikesCount,
  fallbackIsLiked
);
```

## 🔄 **Migration des Composants Existants**

### **Avant (Ancien système)**
```typescript
// Dans un composant
const [isLiked, setIsLiked] = useState(false);
const [likesCount, setLikesCount] = useState(0);

const handleLike = async () => {
  try {
    const response = await fetch(`/api/tracks/${trackId}/like`, {
      method: 'POST'
    });
    const data = await response.json();
    setIsLiked(data.isLiked);
    setLikesCount(data.likesCount);
  } catch (error) {
    console.error('Erreur like:', error);
  }
};

<button onClick={handleLike}>
  <Heart fill={isLiked ? 'red' : 'none'} />
  {likesCount}
</button>
```

### **Après (Nouveau système)**
```typescript
// Option 1: Utiliser le hook directement
const { isLiked, likesCount, isLoading, toggleLike } = useLikeSystem({
  trackId,
  initialLikesCount: track.likes.length,
  initialIsLiked: track.isLiked || false
});

<button onClick={toggleLike} disabled={isLoading}>
  <Heart fill={isLiked ? 'red' : 'none'} />
  {likesCount}
</button>

// Option 2: Utiliser le composant LikeButton
<LikeButton
  trackId={track._id}
  initialLikesCount={track.likes.length}
  initialIsLiked={track.isLiked || false}
  size="md"
  variant="default"
/>
```

## 📱 **Exemples d'Utilisation**

### **1. Dans une liste de pistes**
```typescript
import { useBatchLikeSystem } from '@/hooks/useLikeSystem';

function TrackList({ tracks }) {
  const { toggleLikeBatch, isBatchLoading } = useBatchLikeSystem();

  const handleLike = async (trackId, currentState) => {
    try {
      const result = await toggleLikeBatch(trackId, currentState);
      // Mettre à jour l'état local si nécessaire
    } catch (error) {
      // Gestion d'erreur
    }
  };

  return (
    <div>
      {tracks.map(track => (
        <div key={track._id}>
          <LikeButton
            trackId={track._id}
            initialLikesCount={track.likes.length}
            initialIsLiked={track.isLiked}
            disabled={isBatchLoading(track._id)}
          />
        </div>
      ))}
    </div>
  );
}
```

### **2. Dans une carte de piste**
```typescript
import { useTrackLike } from '@/contexts/LikeContext';

function TrackCard({ track }) {
  const { isLiked, likesCount } = useTrackLike(
    track._id,
    track.likes.length,
    track.isLiked || false
  );

  return (
    <div className="track-card">
      <h3>{track.title}</h3>
      <LikeButton
        trackId={track._id}
        initialLikesCount={likesCount}
        initialIsLiked={isLiked}
        size="sm"
        variant="card"
      />
    </div>
  );
}
```

### **3. Dans un lecteur audio**
```typescript
function AudioPlayer({ track }) {
  const { isLiked, likesCount, toggleLike } = useLikeSystem({
    trackId: track._id,
    initialLikesCount: track.likes.length,
    initialIsLiked: track.isLiked
  });

  return (
    <div className="audio-player">
      <div className="controls">
        <button onClick={toggleLike}>
          <Heart fill={isLiked ? 'red' : 'none'} />
          {likesCount}
        </button>
      </div>
    </div>
  );
}
```

## 🛠️ **Configuration**

### **1. Ajouter le Provider**
Le `LikeProvider` est déjà ajouté dans `app/providers.tsx` :

```typescript
<LikeProvider>
  <AudioPlayerProvider>
    {/* Votre app */}
  </AudioPlayerProvider>
</LikeProvider>
```

### **2. Types TypeScript**
Ajoutez les types dans vos interfaces :

```typescript
interface Track {
  _id: string;
  title: string;
  // ... autres propriétés
  likes: string[];
  isLiked?: boolean; // Optionnel pour la compatibilité
}
```

## 🔧 **Fonctionnalités Avancées**

### **1. Synchronisation en temps réel**
```typescript
import { useLikeContext } from '@/contexts/LikeContext';

const { syncLikeState } = useLikeContext();

// Synchroniser depuis un WebSocket ou autre source
socket.on('like-updated', (data) => {
  syncLikeState(data.trackId, data.isLiked, data.likesCount);
});
```

### **2. Gestion d'erreurs personnalisée**
```typescript
const { toggleLike, error } = useLikeSystem({
  trackId,
  onUpdate: (state) => {
    if (state.error) {
      // Gestion d'erreur personnalisée
      showCustomError(state.error);
    }
  }
});
```

### **3. Cache et performance**
```typescript
// Le système cache automatiquement les états pendant 5 minutes
// Vous pouvez forcer une mise à jour :
const { checkLikeStatus } = useLikeSystem({ trackId });
await checkLikeStatus();
```

## 🚨 **Problèmes Courants**

### **1. État non synchronisé**
**Problème :** Les likes ne se synchronisent pas entre les pages
**Solution :** Utiliser `useTrackLike` au lieu de l'état local

### **2. Erreurs de réseau**
**Problème :** Les likes ne fonctionnent pas en cas de perte de connexion
**Solution :** Le système gère automatiquement les rollbacks

### **3. Performance**
**Problème :** Trop d'appels API pour les likes
**Solution :** Le cache intelligent réduit les appels inutiles

## 📊 **Monitoring et Debug**

### **1. Logs de debug**
```typescript
// Activer les logs détaillés
localStorage.setItem('like-debug', 'true');
```

### **2. État global**
```typescript
// Accéder à l'état global dans la console
console.log(window.likeContext?.likeState);
```

### **3. Statistiques**
```typescript
// Vérifier les performances
const stats = {
  cachedStates: Object.keys(likeState).length,
  totalLikes: Object.values(likeState).reduce((sum, state) => sum + state.likesCount, 0)
};
```

## ✅ **Checklist de Migration**

- [ ] Remplacer les états locaux par `useLikeSystem`
- [ ] Utiliser `LikeButton` au lieu de boutons personnalisés
- [ ] Ajouter `isLiked?: boolean` aux interfaces Track
- [ ] Tester la synchronisation entre les pages
- [ ] Vérifier la gestion d'erreurs
- [ ] Tester les performances

## 🎉 **Avantages du Nouveau Système**

1. **Cohérence** : Tous les likes sont synchronisés partout
2. **Performance** : Cache intelligent et optimistic updates
3. **UX** : Feedback visuel immédiat et notifications
4. **Robustesse** : Gestion d'erreurs complète
5. **Maintenabilité** : Code centralisé et réutilisable

---

**Note :** Ce système est rétrocompatible. Vous pouvez migrer progressivement vos composants existants. 