# IDE AI Generator vs documentation Suno (en ligne)

Référence : [docs.sunoapi.org](https://docs.sunoapi.org) — comparaison avec ce qui est implémenté et ce qu’on peut ajouter ou corriger dans l’IDE (`/ai-generator`).

---

## Ce qui est déjà aligné avec la doc

### Generate Music (`POST /api/v1/generate`)
- **customMode** (Simple vs Custom) : OK
- **instrumental** : OK
- **prompt** : OK, limites par modèle (500 en Simple ; 3000/5000 en Custom) gérées dans `lib/sunoValidation.ts`
- **style**, **title** : OK, limites (200/1000, 80/100) gérées
- **model** : V4, V4_5, V4_5PLUS, V4_5ALL, V5 — OK
- **negativeTags**, **vocalGender**, **styleWeight**, **weirdnessConstraint**, **audioWeight** : envoyés en Custom
- **callBackUrl** : OK (défaut `NEXTAUTH_URL/api/suno/callback`)
- Callbacks **text** / **first** / **complete** : gérés côté callback + polling

### Get Music Generation Details (`GET /api/v1/generate/record-info`)
- Utilisé via `/api/suno/status?taskId=...` — OK
- Statuts doc (PENDING, TEXT_SUCCESS, FIRST_SUCCESS, SUCCESS, CREATE_TASK_FAILED, etc.) mappés dans `status/route.ts`

### Upload and Cover Audio (`POST /api/v1/generate/upload-cover`)
- Route interne `/api/suno/upload-cover` + flux Remix (upload URL puis cover) — OK
- Limite 8 min (et 1 min pour V4_5ALL) : `sunoValidation.validateUploadCoverExtra`

### Generate Lyrics (`POST /api/v1/lyrics`)
- Route `/api/suno/generate-lyrics` — OK
- Callback **complete** uniquement (doc : un seul stade) — OK

### Get Timestamped Lyrics
- Route `/api/suno/timestamped-lyrics` — OK

### Codes d’erreur (doc)
- 400, 401, 404, 405, 413, 429, 430, 455, 500 — à afficher proprement dans l’IDE (voir améliorations).

---

## À ajouter ou à finir (recommandations)

### 1. **Persona (optionnel)** — doc Generate Music
- **personaId** (string) : style ou voix basé sur une musique existante.
- **personaModel** : `style_persona` (défaut) ou `voice_persona` (V5 uniquement).
- Doc : [Generate Persona](https://docs.sunoapi.org/suno-api/generate-persona) pour créer un persona à partir d’un audio.
- **Action** : Exposer en option dans l’IDE (Custom uniquement) : champ Persona ID + liste déroulante style/voice si modèle V5. Création du persona = endpoint séparé à brancher si besoin.

### 2. **Extend Music** — non implémenté
- Doc : [Extend Music](https://docs.sunoapi.org/suno-api/extend-music) — prolonger un morceau existant.
- **POST /api/v1/generate/extend** : `audioId` (obligatoire), `defaultParamFlag`, `continueAt` (sec), `prompt`, `style`, `title`, `model`, `callBackUrl`, etc.
- **Action** : Ajouter une action “Prolonger” sur une piste de la bibliothèque / liste générée : appel à un nouveau route `/api/suno/extend` puis même suivi (callback + polling record-info). Même schéma de statut que Generate (text / first / complete).

### 3. **Limite prompt paroles (Generate Lyrics)** — fait
- Doc : **Generate Lyrics** — prompt **max 200 caractères**.
- **Fait** : Côté front (auto-lyrics), le `seedText` est tronqué à 200 caractères avant envoi. Côté API `/api/suno/generate-lyrics`, `prompt` est déjà tronqué à 200 caractères.

### 4. **Rate limit (doc Generate Music)**
- Doc : “20 requests every 10 seconds. Exceeding this will result in request rejection.” (souvent 430 côté API.)
- **Action** : En cas de 430 (ou message “call frequency too high”), afficher un message clair (“Trop de requêtes, réessayez dans quelques secondes”) et éventuellement désactiver le bouton “Générer” quelques secondes.

### 5. **Rétention 15 jours**
- Doc : “Generated files are retained for 15 days”.
- **Action** : Optionnel : rappel dans l’aide ou les paramètres de l’IDE (“Les fichiers Suno sont conservés 15 jours ; pensez à télécharger ou sauvegarder.”).

### 6. **Erreurs API explicites dans l’IDE**
- Doc : 413 (theme/prompt too long), 429 (insufficient credits), 430 (frequency), 455 (maintenance).
- **Action** : Mapper les codes renvoyés par `/api/suno/generate` (et éventuellement callback) vers des messages utilisateur en français (ex. 429 → “Crédits insuffisants”, 430 → “Trop de requêtes”, 413 → “Texte trop long”, etc.).

### 7. **Upload and Extend Audio** (doc)
- Endpoint séparé : upload + prolongation (pas seulement cover). Moins prioritaire que “Extend” sur un audio déjà généré ; à considérer plus tard si besoin (ex. “Prolonger ce remix”).

---

## Récap actions concrètes pour l’IDE

| Priorité | Action |
|----------|--------|
| Haute | **Extend Music** : route `/api/suno/extend` + bouton “Prolonger” sur une piste (audioId + option continueAt). |
| Haute | **Lyrics** : limiter le prompt paroles à **200 caractères** (compteur + validation). |
| Moyenne | **Erreurs** : afficher messages clairs pour 413, 429, 430, 455 (et autres codes doc). |
| Moyenne | **Rate limit** : message “Trop de requêtes” + cooldown court sur le bouton Générer en cas de 430. |
| Basse | **Persona** : champs optionnels personaId / personaModel (Custom + V5 pour voice_persona). |
| Basse | **Rétention 15 jours** : mention dans l’aide ou les paramètres. |

---

## Références doc Suno

- [Generate Music](https://docs.sunoapi.org/suno-api/generate-music)
- [Get Music Generation Details](https://docs.sunoapi.org/suno-api/get-music-generation-details)
- [Generate Music Callbacks](https://docs.sunoapi.org/suno-api/generate-music-callbacks)
- [Extend Music](https://docs.sunoapi.org/suno-api/extend-music)
- [Upload and Cover Audio](https://docs.sunoapi.org/suno-api/upload-and-cover-audio)
- [Generate Lyrics](https://docs.sunoapi.org/suno-api/generate-lyrics)
- [Lyrics Generation Callbacks](https://docs.sunoapi.org/suno-api/generate-lyrics-callbacks)

API de base : `https://api.sunoapi.org` — Auth : `Authorization: Bearer YOUR_API_KEY`.
