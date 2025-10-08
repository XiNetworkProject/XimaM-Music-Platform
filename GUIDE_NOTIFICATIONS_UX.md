# 🔔 Guide Système de Notifications & UX

## 📦 Composants Ajoutés

### 1. **NotificationCenter** (`components/NotificationCenter.tsx`)
Système de notifications toast moderne avec:
- Toast en haut à droite (max 3 visibles)
- Panneau historique (bouton cloche dans navbar)
- Badge compteur non-lu
- 8 types de notifications
- Auto-dismiss configurable
- Actions personnalisables

### 2. **Skeletons** (`components/Skeletons.tsx`)
Loaders uniformes pour toute l'app:
- `TrackCardSkeleton` / `TrackListSkeleton`
- `ArtistCardSkeleton` / `ArtistGridSkeleton`
- `PlaylistCardSkeleton` / `PlaylistGridSkeleton`
- `ProfileHeaderSkeleton`
- `CommentSkeleton` / `CommentsListSkeleton`
- `StatsCardSkeleton` / `StatsGridSkeleton`
- `MessageSkeleton` / `MessagesListSkeleton`
- `LoadingOverlay` (pour actions critiques)
- `EmptyState` (pages vides avec CTA)

---

## 🚀 Utilisation

### Notifications

```tsx
import { notify } from '@/components/NotificationCenter';

// Success
notify.success('Track uploadée !', 'Votre musique est maintenant en ligne');

// Error
notify.error('Erreur upload', 'Le fichier est trop volumineux');

// Info
notify.info('Nouvelle fonctionnalité', 'Découvrez le mode radio');

// Warning
notify.warning('Quota atteint', 'Il vous reste 2 uploads ce mois-ci');

// Notifications musicales
notify.music('Nouvelle sortie', 'Drake a sorti un nouvel album');
notify.like('@user a aimé votre track');
notify.message('Nouveau message de @artist');
notify.follow('@fan vous suit maintenant');

// Avec action personnalisée
notify.success('Génération terminée', 'Votre musique IA est prête', {
  action: {
    label: 'Écouter',
    onClick: () => router.push('/ai-library')
  },
  duration: 10000 // 10 secondes
});
```

### Skeletons

```tsx
import { 
  TrackListSkeleton, 
  ArtistGridSkeleton, 
  EmptyState,
  LoadingOverlay
} from '@/components/Skeletons';

export default function LibraryPage() {
  const [loading, setLoading] = useState(true);
  const [tracks, setTracks] = useState([]);

  if (loading) {
    return <TrackListSkeleton count={10} />;
  }

  if (tracks.length === 0) {
    return (
      <EmptyState
        icon={<Music size={32} />}
        title="Votre bibliothèque est vide"
        description="Commencez à explorer et sauvegarder votre musique préférée"
        cta="Explorer la musique"
        onCtaClick={() => router.push('/discover')}
      />
    );
  }

  return <TrackList tracks={tracks} />;
}
```

### Loading Overlay

```tsx
import { LoadingOverlay } from '@/components/Skeletons';
import { AnimatePresence } from 'framer-motion';

export default function UploadPage() {
  const [uploading, setUploading] = useState(false);

  return (
    <>
      <AnimatePresence>
        {uploading && (
          <LoadingOverlay message="Upload en cours..." />
        )}
      </AnimatePresence>
      
      <form onSubmit={handleUpload}>
        {/* ... */}
      </form>
    </>
  );
}
```

---

## 🎨 Exemples par Page

### Page Upload
```tsx
// Avant upload
notify.info('Vérification en cours...', 'Analyse du fichier audio');

// Succès
notify.success('Upload réussi !', 'Votre track est maintenant en ligne', 5000);

// Erreur
notify.error('Upload échoué', 'Format audio non supporté');
```

### Page AI Generator
```tsx
// Génération lancée
notify.music('Génération Suno lancée', 'Streaming disponible dans 30-40s');

// Downgrade modèle
notify.warning('Modèle ajusté', 'V5 non disponible, utilisation de V4.5');

// Première piste ready
notify.success('Streaming disponible !', 'Vous pouvez écouter la première piste');

// Génération complète
notify.success('Génération terminée', '2 pistes disponibles en HD');
```

### Page Library
```tsx
// Loading state
{loading ? <PlaylistGridSkeleton count={6} /> : <PlaylistGrid />}

// Empty state
{playlists.length === 0 && (
  <EmptyState
    icon={<Library />}
    title="Aucune playlist"
    description="Créez votre première playlist pour organiser votre musique"
    cta="Créer une playlist"
    onCtaClick={() => setShowCreate(true)}
  />
)}

// Action réussie
notify.success('Playlist créée', `"${playlistName}" a été ajoutée à votre bibliothèque`);
```

### Page Profile
```tsx
// Follow
notify.follow(`@${username} vous suit maintenant`);

// Like
notify.like(`@${username} a aimé "${trackTitle}"`);

// Message
notify.message('Nouveau message', `@${username} vous a envoyé un message`, {
  action: {
    label: 'Répondre',
    onClick: () => router.push(`/messages/${conversationId}`)
  }
});
```

### Page Stats
```tsx
// Loading
{loading ? <StatsGridSkeleton count={4} /> : <StatsGrid />}

// Milestone atteint
notify.success('🎉 100 écoutes !', 'Votre track "Sunset" a dépassé 100 plays', {
  action: {
    label: 'Voir les stats',
    onClick: () => router.push('/stats')
  }
});
```

---

## 🎯 Quick Wins à Implémenter

### 1. Remplacer tous les `toast()` par `notify()`
```bash
# Rechercher dans le code
grep -r "toast(" app/ components/
```

### 2. Ajouter skeletons aux pages principales
- `/discover` → `TrackListSkeleton` + `ArtistGridSkeleton`
- `/library` → `PlaylistGridSkeleton` + `TrackListSkeleton`
- `/profile/[username]` → `ProfileHeaderSkeleton` + `TrackListSkeleton`
- `/stats` → `StatsGridSkeleton`
- `/messages` → `MessagesListSkeleton`

### 3. Ajouter EmptyState partout
- Library vide
- Playlists vides
- Messages vides
- Stats sans data
- Recherche sans résultats

### 4. Notifications pour actions critiques
- Upload réussi/échoué
- Like/Follow/Comment
- Génération IA
- Paiement réussi
- Erreurs API

---

## 🎨 Personnalisation

### Changer la durée par défaut
```tsx
// Dans NotificationCenter.tsx, ligne 48
duration: notification.duration ?? 5000, // 5 secondes
```

### Ajouter un type custom
```tsx
// 1. Ajouter le type
export type NotificationType = 'success' | 'error' | 'boost' | ...;

// 2. Ajouter l'icône
const icons = {
  boost: <Sparkles className="w-5 h-5" />,
  ...
};

// 3. Ajouter la couleur
const colors = {
  boost: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
  ...
};

// 4. Ajouter le helper
export const notify = {
  boost: (title: string, message?: string, duration?: number) =>
    notificationStore.add({ type: 'boost', title, message, duration }),
  ...
};
```

### Position des toasts
```tsx
// Dans NotificationCenter.tsx, ligne ~230
<div className="fixed top-4 right-4 z-[9999] ...">
  
// Alternatives:
// Top center: top-4 left-1/2 -translate-x-1/2
// Bottom right: bottom-4 right-4
// Bottom center: bottom-4 left-1/2 -translate-x-1/2
```

---

## ✅ Checklist Intégration

- [x] NotificationCenter créé
- [x] Skeletons créés
- [x] Intégré dans AppNavbar
- [x] Exemple AI Generator
- [ ] Remplacer react-hot-toast partout
- [ ] Ajouter skeletons à /discover
- [ ] Ajouter skeletons à /library
- [ ] Ajouter skeletons à /profile
- [ ] Ajouter EmptyState partout
- [ ] Notifications upload
- [ ] Notifications boosters
- [ ] Notifications sociales

---

## 🚀 Prochaines Étapes

1. **Remplacer `react-hot-toast`** dans toute l'app
2. **Ajouter skeletons** aux 5 pages principales
3. **Implémenter EmptyState** sur toutes les pages
4. **Ajouter notifications** pour toutes les actions critiques
5. **Tester sur mobile** (responsive)
6. **Ajouter haptic feedback** (vibrations) pour les notifications importantes

