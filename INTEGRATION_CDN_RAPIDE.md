# Intégration CDN Rapide

## ✅ Déjà fait (automatique sur toutes les pages)

### 1. Hook Audio (`useAudioService.ts`)
✅ Toutes les lectures audio passent automatiquement par le CDN
- Aucune modification nécessaire sur les pages qui utilisent le player

### 2. TikTokPlayer
✅ Covers, audio, preloading → CDN automatique

## 📋 À faire manuellement (optionnel, pour optimisation)

### Pages principales à optimiser

#### 1. Page Discover (`app/page.tsx`)
```typescript
import { applyCdnToTracks, applyCdnToUsers } from '@/lib/cdnHelpers';

// Après fetch des tracks
const tracks = await fetch('/api/tracks').then(r => r.json());
const cdnTracks = applyCdnToTracks(tracks);

// Après fetch des users
const users = await fetch('/api/users').then(r => r.json());
const cdnUsers = applyCdnToUsers(users);
```

#### 2. Page Library (`app/library/page.tsx`)
```typescript
import { applyCdnToTracks } from '@/lib/cdnHelpers';

// Dans fetchLibraryData
const { data: tracks } = await supabase.from('tracks').select('*');
const cdnTracks = applyCdnToTracks(tracks || []);
```

#### 3. Page Profile (`app/profile/[username]/page.tsx`)
```typescript
import { applyCdnToUser, applyCdnToTracks } from '@/lib/cdnHelpers';

// Profile
const profile = applyCdnToUser(fetchedProfile);

// Tracks du profile
const tracks = applyCdnToTracks(fetchedTracks);
```

### Méthode ultra-rapide : wrapper fetch

Au lieu de modifier chaque fetch, utilise `fetchWithCdn` :

```typescript
import { fetchWithCdn } from '@/lib/cdnHelpers';

// Avant
const response = await fetch('/api/tracks');
const data = await response.json();

// Après (applique automatiquement le CDN)
const response = await fetchWithCdn('/api/tracks');
const data = await response.json(); // Déjà avec CDN !
```

## 🚀 Priorités

### Haute priorité (fort impact)
1. ✅ `useAudioService.ts` - **FAIT**
2. ✅ `TikTokPlayer.tsx` - **FAIT**
3. `app/page.tsx` (Discover) - beaucoup d'images/audio
4. `app/library/page.tsx` - beaucoup de covers

### Moyenne priorité
5. `app/profile/[username]/page.tsx` - avatars + tracks
6. `components/TrackCard.tsx` - si utilisé souvent
7. `components/Avatar.tsx` - avatars partout

### Basse priorité (déjà optimisé par le player)
- Pages qui n'affichent que des previews
- Pages sans images/audio
- Composants qui utilisent déjà le player

## 🔧 Cas spéciaux

### Images dans `<img>` direct
```typescript
import { getCdnUrl } from '@/lib/cdn';

<img src={getCdnUrl(track.coverUrl)} alt="Cover" />
```

### Composant Avatar
```typescript
// components/Avatar.tsx
import { getCdnUrl } from '@/lib/cdn';

export function Avatar({ src }: { src: string }) {
  return <img src={getCdnUrl(src) || src} />;
}
```

### API Routes (server-side)
```typescript
// app/api/tracks/route.ts
import { applyCdnToTracks } from '@/lib/cdnHelpers';

export async function GET() {
  const { data: tracks } = await supabase.from('tracks').select('*');
  const cdnTracks = applyCdnToTracks(tracks);
  return NextResponse.json({ tracks: cdnTracks });
}
```

## 📊 Vérification

### Test rapide
1. Ouvrir DevTools (F12) → Network
2. Filtrer par "Img" ou "Media"
3. Vérifier que les URLs commencent par `synaura-cdn.b-cdn.net`

### Test complet
```typescript
// Ajouter temporairement dans une page
console.log('Original:', track.audioUrl);
console.log('CDN:', getCdnUrl(track.audioUrl));
```

## ⚡ Performance attendue

- **Avant** : Cloudinary direct (latence variable)
- **Après** : Bunny CDN (latence < 50ms)
- **Économies** : ~70% sur bandwidth
- **Cache hit** : objectif > 95%

## 🛠️ Rollback

Si problème, désactiver temporairement :
```env
# .env.local
NEXT_PUBLIC_CDN_ENABLED=false
```

Tout redevient normal immédiatement, pas besoin de redéployer !

