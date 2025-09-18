# 🎵 Guide Migration Suno Normalisation

## 📋 Vue d'ensemble

Migration complète vers un système de normalisation unifié pour gérer les tracks Suno en **snake_case** (webhook) et **camelCase** (polling).

## 🔧 Fichiers Modifiés

### 1. **lib/suno-normalize.ts** (NOUVEAU)
```typescript
export type Track = {
  id: string;
  title?: string;
  audio?: string;      // lien .mp3/.m4a prêt à lire/télécharger
  stream?: string;     // lien streaming (peut arriver plus tôt)
  image?: string;      // cover
  duration?: number;   // en secondes
  raw?: any;           // payload brut si tu veux le stocker
};

export function normalizeSunoItem(item: any): Track {
  // Supporte webhook (snake_case) ET polling (camelCase)
  const id = item.id ?? item.audioId ?? item.trackId ?? crypto.randomUUID();
  return {
    id,
    title: item.title ?? item.promptTitle ?? undefined,
    audio: item.audio_url ?? item.audioUrl ?? item.source_audio_url ?? item.sourceAudioUrl,
    stream: item.stream_audio_url ?? item.streamAudioUrl ?? item.source_stream_audio_url ?? item.sourceStreamAudioUrl,
    image: item.image_url ?? item.imageUrl ?? item.source_image_url ?? item.sourceImageUrl,
    duration: item.duration ?? undefined,
    raw: item,
  };
}
```

### 2. **app/api/suno/callback/route.ts**
- ✅ Import de `normalizeSunoItem`
- ✅ Remplacement de la conversion manuelle par `normalizeSunoItem`
- ✅ Simplification du code

### 3. **app/api/suno/status/route.ts**
- ✅ Remplacement de `getRecordInfo` par appel direct à l'API Suno
- ✅ Utilisation de `normalizeSunoItem` pour les tracks
- ✅ Headers d'authentification corrects

### 4. **lib/aiGenerationService.ts**
- ✅ Import de `Track` depuis `suno-normalize`
- ✅ Mise à jour des signatures de méthodes
- ✅ Adaptation des propriétés (`audio` au lieu de `audioUrl`)

### 5. **app/ai-generator/page.tsx**
- ✅ Mise à jour de la conversion des tracks
- ✅ Utilisation des propriétés normalisées (`audio`, `stream`)

### 6. **components/TracksList.tsx** (NOUVEAU)
- ✅ Composant réutilisable pour afficher les tracks
- ✅ Support des propriétés normalisées

## 🎯 Avantages

### ✅ **Unification**
- Une seule interface `Track` pour webhook et polling
- Plus de confusion entre `audioUrl`/`audio_url`

### ✅ **Robustesse**
- Gestion automatique des formats snake_case/camelCase
- Fallback avec `crypto.randomUUID()` pour les IDs manquants

### ✅ **Maintenabilité**
- Code plus propre et centralisé
- Moins de duplication

### ✅ **Compatibilité**
- Support des anciens et nouveaux formats Suno
- Migration transparente

## 🔄 Flux de Données

### **Webhook** (Recommandé)
```
Suno POST → /api/suno/callback → normalizeSunoItem → DB
```

### **Polling** (Fallback)
```
Frontend → /api/suno/status → API Suno → normalizeSunoItem → Frontend
```

## 🧪 Test

1. **Générer une musique** en mode personnalisé
2. **Vérifier les logs** dans la console :
   - `🔍 Données brutes Suno:`
   - `🎵 Tracks normalisées:`
3. **Confirmer l'affichage** des tracks dans l'interface

## 🚀 Déploiement

Aucune migration de base de données requise. Les changements sont uniquement au niveau du code.

## 📝 Notes

- Les tracks existantes continuent de fonctionner
- La normalisation est transparente pour l'utilisateur
- Performance améliorée avec moins de conversions
