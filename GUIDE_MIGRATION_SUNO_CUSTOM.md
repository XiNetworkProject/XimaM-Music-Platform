# Guide de Migration - Mode Personnalisé Suno

## 🎯 Objectif
Mise à jour du système de génération IA pour supporter le mode personnalisé de Suno selon leurs spécifications officielles.

## 📋 Changements Apportés

### 1. **Client Suno (`lib/suno.ts`)**
- ✅ Nouveaux types TypeScript pour le mode personnalisé
- ✅ Fonction `generateCustomMusic()` avec validation des règles
- ✅ Fonction `getRecordInfo()` mise à jour
- ✅ Fonction utilitaire `createProductionPrompt()` pour les hints de production

### 2. **Nouvel Endpoint (`app/api/suno/generate/route.ts`)**
- ✅ Endpoint dédié pour la génération personnalisée
- ✅ Validation selon les règles Suno :
  - `title` et `style` obligatoires
  - `prompt` requis si `instrumental=false`
- ✅ Support des paramètres optionnels (BPM, tonalité, durée)
- ✅ Intégration automatique des hints de production

### 3. **Endpoint IA Génération (`app/api/ai/generate/route.ts`)**
- ✅ Migration vers `generateCustomMusic()`
- ✅ Support du mode personnalisé par défaut
- ✅ Correction des types de retour

### 4. **Hook de Suivi (`hooks/useSunoWaiter.ts`)**
- ✅ Mise à jour des types de statut
- ✅ Support des nouveaux formats de réponse Suno
- ✅ Gestion des erreurs améliorée

### 5. **Endpoint de Statut (`app/api/suno/status/route.ts`)**
- ✅ Migration vers `getRecordInfo()`
- ✅ Normalisation des réponses pour le frontend

## 🔧 Règles Suno Mode Personnalisé

### Validation Obligatoire
```typescript
// Toujours requis
title: string;        // ≤ 80 caractères
style: string;        // V3_5/V4: 200 chars, V4_5/V4_5PLUS: 1000 chars

// Conditionnel
prompt?: string;      // Requis si instrumental=false
                      // V3_5/V4: 3000 chars, V4_5/V4_5PLUS: 5000 chars
```

### Paramètres Optionnels
```typescript
model?: string;                    // "V3_5" | "V4" | "V4_5" | "V4_5PLUS"
negativeTags?: string;             // Tags négatifs
vocalGender?: "m" | "f";          // Genre de voix
styleWeight?: number;             // 0-1
weirdnessConstraint?: number;     // 0-1 (créativité)
audioWeight?: number;             // 0-1
callBackUrl?: string;             // Webhook URL
```

## 🎵 Hints de Production

Le système injecte automatiquement les paramètres de production dans le prompt :

```typescript
// Exemple de prompt généré
`${prompt}

[Production notes]
BPM: ${bpm || 128}
Key: ${key || "A minor"}
Structure hint: ${durationHint || "radio edit 2:30–3:00 with intro / verse / pre / drop"}`
```

## 📊 Flux de Génération

1. **Frontend** → `POST /api/suno/generate`
2. **Validation** → Règles Suno appliquées
3. **Suno API** → `POST /api/v1/generate` (customMode: true)
4. **Webhook** → `POST /api/suno/callback` (recommandé)
5. **Fallback** → `GET /api/v1/generate/record-info` (polling)

## 🚀 Avantages

### Pour l'Utilisateur
- ✅ Contrôle précis sur le style et le titre
- ✅ Support des paramètres de production (BPM, tonalité)
- ✅ Génération de 2 morceaux par requête
- ✅ Qualité audio améliorée

### Pour le Développeur
- ✅ Types TypeScript stricts
- ✅ Validation automatique
- ✅ Gestion d'erreurs robuste
- ✅ Documentation claire

## 🔄 Migration Automatique

Le système migre automatiquement les anciennes requêtes vers le nouveau format :

```typescript
// Ancien format
{
  prompt: "une musique électro",
  duration: 30,
  style: "electronic"
}

// Nouveau format
{
  title: "Musique générée",
  style: "electronic",
  prompt: "une musique électro",
  instrumental: false,
  model: "V4_5"
}
```

## 📝 Notes Importantes

- **Concurrence** : 20 requêtes / 10 secondes
- **Durée** : Stream ~30-40s, Download ~2-3min
- **Résultats** : Exactement 2 morceaux par requête
- **Webhooks** : Fortement recommandés pour le suivi en temps réel

## 🧪 Test

Pour tester le nouveau système :

```bash
# Test de génération personnalisée
curl -X POST http://localhost:3000/api/suno/generate \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Custom",
    "style": "electronic, future bass",
    "prompt": "une musique électro française",
    "instrumental": false,
    "model": "V4_5"
  }'
```

## ✅ Statut

- [x] Client Suno mis à jour
- [x] Endpoint personnalisé créé
- [x] Endpoint IA migré
- [x] Hook de suivi mis à jour
- [x] Endpoint de statut migré
- [x] Documentation créée

Le système est maintenant prêt pour le mode personnalisé Suno ! 🎉
