# Guide de Migration - Système de Comptage d'Écoutes Amélioré

## 🎯 **Vue d'ensemble**

Le nouveau système de comptage d'écoutes a été conçu pour résoudre tous les problèmes de synchronisation et de cohérence. Il offre :

- ✅ **Synchronisation globale** entre tous les composants
- ✅ **Gestion des doublons** avec système de verrous
- ✅ **Cache intelligent** pour les performances
- ✅ **Optimistic updates** avec rollback automatique
- ✅ **Gestion d'erreurs robuste**

## 🚀 **Composants Principaux**

### **1. Hook `usePlaysSystem`**
```typescript
import { usePlaysSystem } from '@/hooks/usePlaysSystem';

const { plays, formattedPlays, isLoading, error, incrementPlays } = usePlaysSystem({
  trackId: 'track-id',
  initialPlays: 42,
  onUpdate: (state) => {
    // Callback appelé à chaque mise à jour
    console.log('Plays state updated:', state);
  },
  autoSync: true,
  syncInterval: 30000
});
```

### **2. Composant `PlaysCounter`**
```typescript
import PlaysCounter from '@/components/PlaysCounter';

<PlaysCounter
  trackId="track-id"
  initialPlays={42}
  size="md"
  variant="default"
  showIcon={true}
  onUpdate={(state) => {
    // Mise à jour de l'état parent
  }}
/>
```

### **3. Contexte Global `PlaysContext`**
```typescript
import { useTrackPlays } from '@/contexts/PlaysContext';

const { plays, isLoading, error, hasCachedState } = useTrackPlays(
  trackId,
  fallbackPlays
);
```

## 🔄 **Migration des Composants Existants**

### **Avant (Ancien système)**
```typescript
// Dans un composant
const [plays, setPlays] = useState(0);

const handlePlay = async () => {
  try {
    const response = await fetch(`/api/tracks/${trackId}/plays`, {
      method: 'POST'
    });
    const data = await response.json();
    setPlays(data.plays);
  } catch (error) {
    console.error('Erreur plays:', error);
  }
};

<div>
  <Headphones size={14} />
  <span>{plays}</span>
</div>
```

### **Après (Nouveau système)**
```typescript
// Option 1: Utiliser le hook directement
const { plays, formattedPlays, isLoading, incrementPlays } = usePlaysSystem({
  trackId,
  initialPlays: track.plays
});

<div>
  <Headphones size={14} />
  <span>{formattedPlays}</span>
  {isLoading && <div className="loading-indicator" />}
</div>

// Option 2: Utiliser le composant PlaysCounter
<PlaysCounter
  trackId={track._id}
  initialPlays={track.plays}
  size="md"
  variant="default"
/>
```

## 📱 **Exemples d'Utilisation**

### **1. Dans une liste de pistes**
```typescript
import { useBatchPlaysSystem } from '@/hooks/usePlaysSystem';

function TrackList({ tracks }) {
  const { incrementPlaysBatch, isBatchLoading } = useBatchPlaysSystem();

  const handlePlay = async (trackId, currentPlays) => {
    try {
      const result = await incrementPlaysBatch(trackId, currentPlays);
      // Mettre à jour l'état local si nécessaire
    } catch (error) {
      // Gestion d'erreur
    }
  };

  return (
    <div>
      {tracks.map(track => (
        <div key={track._id}>
          <PlaysCounter
            trackId={track._id}
            initialPlays={track.plays}
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
import { useTrackPlays } from '@/contexts/PlaysContext';

function TrackCard({ track }) {
  const { plays, isLoading } = useTrackPlays(
    track._id,
    track.plays
  );

  return (
    <div className="track-card">
      <h3>{track.title}</h3>
      <PlaysCounter
        trackId={track._id}
        initialPlays={plays}
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
  const { plays, incrementPlays } = usePlaysSystem({
    trackId: track._id,
    initialPlays: track.plays
  });

  const handlePlay = async () => {
    // Jouer la piste
    await playTrack(track);
    
    // Incrémenter les écoutes
    await incrementPlays();
  };

  return (
    <div className="audio-player">
      <div className="controls">
        <button onClick={handlePlay}>
          <Play size={16} />
        </button>
        <span>{plays} écoutes</span>
      </div>
    </div>
  );
}
```

## 🛠️ **Configuration**

### **1. Ajouter le Provider**
Le `PlaysProvider` est déjà ajouté dans `app/providers.tsx` :

```typescript
<PlaysProvider>
  <AudioPlayerProvider>
    {/* Votre app */}
  </AudioPlayerProvider>
</PlaysProvider>
```

### **2. Types TypeScript**
Ajoutez les types dans vos interfaces :

```typescript
interface Track {
  _id: string;
  title: string;
  // ... autres propriétés
  plays: number;
}
```

## 🔧 **Fonctionnalités Avancées**

### **1. Synchronisation en temps réel**
```typescript
import { usePlaysContext } from '@/contexts/PlaysContext';

const { syncPlays } = usePlaysContext();

// Synchroniser depuis un WebSocket ou autre source
socket.on('plays-updated', (data) => {
  syncPlays(data.trackId, data.plays);
});
```

### **2. Gestion d'erreurs personnalisée**
```typescript
const { incrementPlays, error } = usePlaysSystem({
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
const { fetchPlays } = usePlaysSystem({ trackId });
await fetchPlays();

// Ou nettoyer le cache :
import { clearPlaysCache } from '@/hooks/usePlaysSystem';
clearPlaysCache(); // Tous les caches
clearPlaysCache(trackId); // Cache spécifique
```

## 🚨 **Problèmes Courants**

### **1. État non synchronisé**
**Problème :** Les écoutes ne se synchronisent pas entre les pages
**Solution :** Utiliser `useTrackPlays` au lieu de l'état local

### **2. Doublons d'incrémentation**
**Problème :** Les écoutes s'incrémentent plusieurs fois
**Solution :** Le système gère automatiquement les verrous

### **3. Performance**
**Problème :** Trop d'appels API pour les écoutes
**Solution :** Le cache intelligent réduit les appels inutiles

## 📊 **Monitoring et Debug**

### **1. Logs de debug**
```typescript
// Activer les logs détaillés
localStorage.setItem('plays-debug', 'true');
```

### **2. État global**
```typescript
// Accéder à l'état global dans la console
console.log(window.playsContext?.playsState);
```

### **3. Statistiques**
```typescript
// Vérifier les performances
const stats = {
  cachedStates: Object.keys(playsState).length,
  totalPlays: Object.values(playsState).reduce((sum, state) => sum + state.plays, 0)
};
```

## ✅ **Checklist de Migration**

- [ ] Remplacer les états locaux par `usePlaysSystem`
- [ ] Utiliser `PlaysCounter` au lieu de compteurs personnalisés
- [ ] Tester la synchronisation entre les pages
- [ ] Vérifier la gestion des doublons
- [ ] Tester les performances
- [ ] Vérifier la gestion d'erreurs

## 🎉 **Avantages du Nouveau Système**

1. **Cohérence** : Toutes les écoutes sont synchronisées partout
2. **Performance** : Cache intelligent et optimistic updates
3. **Robustesse** : Gestion des doublons et rollback automatique
4. **UX** : Feedback visuel immédiat
5. **Maintenabilité** : Code centralisé et réutilisable

## 🔄 **Migration Progressive**

Le système est **rétrocompatible**. Vous pouvez :

1. **Migrer progressivement** vos composants existants
2. **Tester** le nouveau système en parallèle
3. **Remplacer** les anciennes implémentations une par une

## 🚀 **Fonctionnalités Spéciales**

### **1. Optimistic Updates**
```typescript
// L'interface se met à jour immédiatement
const { incrementPlays } = usePlaysSystem({ trackId });
await incrementPlays(); // Interface +1 immédiatement
```

### **2. Gestion des Verrous**
```typescript
// Évite les doublons automatiquement
// Si un utilisateur clique plusieurs fois rapidement
// Seule la première incrémentation sera traitée
```

### **3. Cache Intelligent**
```typescript
// Cache automatique pendant 5 minutes
// Synchronisation périodique toutes les 30 secondes
// Nettoyage automatique des états expirés
```

---

**Note :** Ce système est rétrocompatible. Vous pouvez migrer progressivement vos composants existants. 