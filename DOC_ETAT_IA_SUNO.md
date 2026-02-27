# État des lieux – IA / Suno (docs vs code)

Document de référence pour aligner la documentation sur le comportement réel et identifier les améliorations.

## ✅ Ce qui est à jour après vérification

- **Callback webhook** : L’URL utilisée est `NEXTAUTH_URL + /api/suno/callback` (définie dans `app/api/suno/generate/route.ts`).  
  `GUIDE_WEBHOOK_SUNO.md` a été corrigé (avant : `/api/ai/webhook`).
- **Flux génération** :  
  Frontend → `POST /api/suno/generate` → Suno → callbacks `first` puis `complete` → `POST /api/suno/callback` → persistance uniquement sur `complete` via `aiGenerationService`.
- **Suivi temps réel** :  
  `useBackgroundGeneration` (polling `GET /api/suno/status?taskId=...`), pas uniquement `useSunoWaiter`.  
  `INTEGRATION_SUNO_COMPLETE.md` mis à jour en conséquence.
- **URLs finales** :  
  Après "complete", l’UI privilégie `audio_url` (fichier final) pour liste et téléchargement ; `stream_audio_url` reste en backup pour la lecture. Sync des `generatedTracks` avec la bibliothèque après refresh.
- **Normalisation** :  
  `lib/suno-normalize.ts` gère webhook (snake_case) et polling (camelCase) ; `audio` = final, `stream` = stream.
- **Cover et paroles à l’upload** :  
  - **Upload simple** (`POST /api/ai/upload-source`) : une image de cover par défaut (`/default-cover.svg`) est assignée ; les paroles sont récupérées **automatiquement** via **OpenAI Whisper** (transcription de l’audio) si `OPENAI_API_KEY` est défini. Les champs `lyrics` et `prompt` de la track (et de la génération) sont mis à jour avec le texte transcrit.  
  - **Remix / upload-cover** : au callback `complete`, Suno renvoie pour chaque piste `image_url` (cover) et `prompt` (paroles). Ces champs sont persistés via `updateGenerationStatus` → `saveTracks`.  
  - **Note** : l’API Suno ne fournit pas d’extraction de paroles depuis un fichier ; c’est notre stack (Whisper) qui le fait à l’upload simple.

## 📁 Routes API concernées

| Route | Rôle |
|-------|------|
| `POST /api/suno/generate` | Génération (crédits, Simple/Custom, callback URL) |
| `POST /api/suno/callback` | Webhook Suno → mise à jour statut + persistance tracks au "complete" |
| `GET /api/suno/status?taskId=` | Polling record-info pour le suivi live |
| `POST /api/suno/save-tracks` | Sauvegarde explicite des tracks (appelée par le hook si besoin) |
| `POST /api/suno/upload-cover` | Upload pochette (remix) |
| `POST /api/suno/generate-lyrics` | Génération paroles |
| `GET /api/suno/timestamped-lyrics` | Paroles avec timestamps |
| `GET /api/suno/credits` | Crédits Suno (optionnel) |
| `POST /api/ai/generate` | Route alternative / legacy (autre schéma) |
| `POST /api/ai/webhook` | Ancien webhook ; schéma différent (audio_url en `ai_generations`), **non utilisé** par le flux actuel |

## 🔧 Améliorations possibles (fonctionnel)

1. **Lyrics / paroles**  
   - Vérifier que la doc interne décrit le flux `generate-lyrics` → `timestamped-lyrics` et l’UX (affichage, synchro avec le player).
2. **Remix / cover**  
   - Documenter le flux Remix (upload cover → génération) dans un guide dédié ou dans `INTEGRATION_SUNO_COMPLETE.md`.
3. **Gestion d’erreurs**  
   - Callback `error` : s’assurer que le statut en base est bien `failed` et que l’UI affiche un message clair (déjà partiel dans le callback).
4. **Quotas / crédits**  
   - Les crédits sont débités dans `/api/suno/generate` ; en cas d’échec Suno après coup, envisager un remboursement ou une file de “retry” (avancé).
5. **Batch**  
   - Enchaîner plusieurs générations (file d’attente côté client ou endpoint dédié) et afficher l’avancement global.
6. **Analytics**  
   - Temps moyen par génération, taux de succès par modèle, usage des modes Simple vs Custom (pour ajuster UX et coûts).

## 📚 Fichiers de doc modifiés

- `GUIDE_WEBHOOK_SUNO.md` : URL callback corrigée → `/api/suno/callback`, exemple curl mis à jour.
- `INTEGRATION_SUNO_COMPLETE.md` : routes réelles, hook `useBackgroundGeneration`, flux initiation/suivi/URLs, section “Prochaines Améliorations” remplacée par “État actuel et améliorations possibles”.

## 🐛 Points déjà corrigés (résumé)

- Priorité **audio_url** sur **stream_audio_url** après "complete" dans l’UI (liste + téléchargement).
- Synchronisation des **generatedTracks** avec la bibliothèque après passage en "completed" et refresh, pour éviter des liens incorrects ou expirés.
