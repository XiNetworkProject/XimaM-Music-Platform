# Configuration du CDN Bunny pour Synaura

## 1. Configuration Bunny CDN

### Configurer la Pull Zone
1. Aller sur [Bunny.net Dashboard](https://panel.bunny.net)
2. Sélectionner votre Pull Zone : **synaura-cdn**
3. **Paramètres importants** :
   - **Origin URL**: `https://res.cloudinary.com` ⚠️ **IMPORTANT**
   - **CDN URL**: `synaura-cdn.b-cdn.net` ✅
   - **Custom Hostname** (optionnel): `cdn.synaura.fr`
   
4. **Configuration avancée** :
   - Aller dans **Pull Zone Settings** → **Origin**
   - Vérifier que **Origin URL** = `https://res.cloudinary.com`
   - **Origin Host Header** : laisser vide ou mettre `res.cloudinary.com`
   - **Override Origin Host Header** : OFF

### Configuration DNS (Optionnel)
Si vous voulez utiliser un domaine personnalisé `cdn.synaura.fr` :
```
Type: CNAME
Name: cdn
Value: synaura-cdn.b-cdn.net
TTL: 3600
```

**Note**: Pour l'instant, vous pouvez utiliser directement `synaura-cdn.b-cdn.net`

### Paramètres recommandés Bunny

#### Caching
- **Cache Expiration**: 1 year (31536000 seconds)
- **Query String Sort**: Enabled
- **Vary Cache**: Disabled

#### Performance
- **Origin Shield**: Enabled
- **Optimizer**: Enabled (pour images)
- **WebP Conversion**: Enabled
- **Auto-optimization**: Enabled

#### Security
- **Token Authentication**: Optional (pour contenus privés)
- **Origin Shield**: Paris ou Stockholm (proche de l'Europe)

## 2. Variables d'environnement

Ajouter dans `.env.local` :
```env
# CDN Configuration
NEXT_PUBLIC_CDN_ENABLED=true
NEXT_PUBLIC_CDN_DOMAIN=cdn.synaura.fr
```

## 3. Utilisation dans le code

### Import
```typescript
import { getCdnUrl, applyCdnToTrack, applyCdnToTracks } from '@/lib/cdn';
```

### Exemples

#### URL simple
```typescript
const cloudinaryUrl = 'https://res.cloudinary.com/dtgglgtfx/image/upload/v123/cover.jpg';
const cdnUrl = getCdnUrl(cloudinaryUrl);
// → https://synaura-cdn.b-cdn.net/dtgglgtfx/image/upload/v123/cover.jpg
```

**Note** : Le CDN remplace juste le domaine `res.cloudinary.com` par `synaura-cdn.b-cdn.net`. Le reste du chemin reste identique.

#### Track object
```typescript
const track = {
  title: 'My Song',
  audioUrl: 'https://res.cloudinary.com/synaura/video/upload/audio.mp3',
  coverUrl: 'https://res.cloudinary.com/synaura/image/upload/cover.jpg'
};

const cdnTrack = applyCdnToTrack(track);
// Toutes les URLs Cloudinary sont remplacées par le CDN
```

#### Array de tracks
```typescript
const tracks = [...]; // array de tracks avec URLs Cloudinary
const cdnTracks = applyCdnToTracks(tracks);
```

#### Profile
```typescript
const profile = {
  name: 'John',
  avatar: 'https://res.cloudinary.com/synaura/image/upload/avatar.jpg',
  banner: 'https://res.cloudinary.com/synaura/image/upload/banner.jpg'
};

const cdnProfile = applyCdnToProfile(profile);
```

## 4. Intégration dans les APIs

### Exemple: API tracks
```typescript
// app/api/tracks/route.ts
import { applyCdnToTracks } from '@/lib/cdn';

export async function GET() {
  const { data: tracks } = await supabase.from('tracks').select('*');
  
  // Appliquer le CDN à toutes les URLs
  const cdnTracks = applyCdnToTracks(tracks);
  
  return NextResponse.json({ tracks: cdnTracks });
}
```

### Exemple: API profil
```typescript
// app/api/users/[username]/route.ts
import { applyCdnToProfile } from '@/lib/cdn';

export async function GET() {
  const { data: profile } = await supabase.from('profiles').select('*').single();
  
  // Appliquer le CDN au profil
  const cdnProfile = applyCdnToProfile(profile);
  
  return NextResponse.json(cdnProfile);
}
```

## 5. Tests

### Vérifier que le CDN fonctionne
1. Ouvrir une page avec des images/audio
2. Inspecter le réseau (F12 → Network)
3. Vérifier que les URLs commencent par `synaura-cdn.b-cdn.net`

### Désactiver temporairement le CDN
```typescript
import { setCdnEnabled } from '@/lib/cdn';

// En développement
if (process.env.NODE_ENV === 'development') {
  setCdnEnabled(false);
}
```

## 6. Avantages

✅ **Performance** : 
- Mise en cache globale sur 260+ edge locations
- Réduction latence jusqu'à 70%

✅ **Coûts** :
- Bunny CDN : ~$0.01/GB (vs Cloudinary bandwidth)
- Économies significatives sur le trafic

✅ **Optimisation** :
- WebP automatique
- Compression intelligente
- Resize à la volée

✅ **Fiabilité** :
- Fallback automatique vers Cloudinary
- 99.9% uptime garantie

## 7. Migration progressive

Le système est transparent et rétrocompatible :
- Les anciennes URLs Cloudinary continuent de fonctionner
- Le CDN remplace progressivement les URLs
- Aucune modification de base de données nécessaire

## 8. Monitoring

### Bunny Dashboard
- Trafic en temps réel
- Hit ratio (cache)
- Bandwidth usage
- Geographic distribution

### Métriques clés
- **Cache Hit Ratio** : objectif > 95%
- **Response Time** : < 50ms (avg)
- **Bandwidth Savings** : > 80%

