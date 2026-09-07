# Audit de securite - Phase 0B

Date de l'audit : 2026-09-07. Perimetre : authentification, support, AudD, uploads publics, routes IA/Suno, diagnostics, headers et protection ciblee des mutations. Aucun changement de schema ou de donnees n'a ete effectue.

## Problemes confirmes et corrections

- L'authentification par mot de passe, l'inscription, la recuperation, le reset, les OTP et la MFA ne disposaient pas de limites serveur coherentes. Des limites par IP et, lorsque pertinent, par identifiant normalise puis hache ont ete ajoutees. Le callback OAuth mobile place aussi desormais ses jetons dans le fragment du deep link plutot que dans sa query string.
- `/api/suno/status`, l'ancien `/api/ai/status/[taskId]`, `/api/suno/timestamped-lyrics` et surtout `/api/suno/save-tracks` acceptaient un `taskId` sans preuve suffisante de propriete. Les requetes sont maintenant rattachees a `ai_generations.user_id`; la sauvegarde ne cree plus une generation depuis un task ID arbitraire.
- `/api/ai/webhook` permettait une mise a jour de generation sans signature. Il exige maintenant la signature HMAC Suno commune.
- `/api/upload/copyright-check` etait un proxy AudD public, sans timeout ni limite, et exposait `resultRaw`. Il exige maintenant une session web/mobile, un fichier local `audio` appartenant a l'utilisateur, une limite utilisateur/IP et ne renvoie qu'un sous-ensemble explicite.
- L'upload audio Star Academy et les deux formulaires de candidature publics n'avaient pas de limite anti-spam/remplissage disque. Ils sont bornes par IP et les candidatures aussi par email hache.
- Le support acceptait des JSON et champs non bornes. Le corps est limite a 16 Kio, le message a 5 000 caracteres, les URL aux protocoles HTTP(S), et les controles/informations superflus sont retires.
- Plusieurs routes Suno journalisaient headers, prompts, payloads, reponses completes, URLs media ou objets session. Ces journaux et les reponses fournisseur brutes ont ete retires des chemins sensibles.
- Le solde global du compte fournisseur Suno etait accessible a tout membre authentifie. `/api/suno/credits` est maintenant reserve aux administrateurs et limite.
- Les pages debug/test etaient routables en production. Le middleware renvoie maintenant 404 avant toute logique applicative.

## Faux positifs et protections deja presentes

- L'upload local valide deja l'extension et le MIME, controle la signature des images, utilise `ffprobe` pour verifier une vraie piste audio/video, ecrit d'abord un fichier `.part`, efface les fichiers invalides et impose une limite pendant le streaming.
- L'audio Star Academy etait deja limite a 30 Mo et conditionne par l'ouverture et la date du concours. Il doit rester public pour permettre une candidature sans compte.
- Les uploads Meteo sont authentifies, limites a 10 Mo par le stockage local et verifies comme images. L'envoi de presentation Meteo a ete securise en Phase 0A.
- Les callbacks `/api/suno/callback` et `/api/suno/music-video-callback` exigeaient deja un jeton HMAC. La Phase 0B a surtout retire les logs de payload du premier.
- `/api/suno/generate-music-video` verifiait deja le proprietaire de la piste et la coherence `trackId`/`taskId`/`audioId`.
- Les tokens de reset de mot de passe sont haches en base, expirent apres 10 minutes, sont verrouilles transactionnellement et marques utilises. La cryptographie n'a pas ete remplacee.
- NextAuth conserve sa propre protection CSRF/state pour ses routes gerees. Les cookies de session sont Secure en production et les valeurs SameSite de NextAuth restent en vigueur.

## Classification IA / Suno

| Route | Classification | Resultat de l'audit |
| --- | --- | --- |
| `/api/suno/generate` | Active et utilisee | Auth web/mobile, credits et validation deja presents; ajout origine, 5/10 min/utilisateur, JSON 64 Kio, timeout fournisseur, reponse/logs filtres. |
| `/api/suno/status` | Active et utilisee | Ajout ownership, validation task ID, 30/min/utilisateur + 12/min/task, timeout et filtrage fournisseur. |
| `/api/suno/save-tracks` | Active et utilisee | Faille ownership corrigee; task existante obligatoire, 20/min/utilisateur, maximum 8 pistes et JSON 256 Kio. |
| `/api/suno/upload-cover` | Active et utilisee | Ajout origine, 5/10 min/utilisateur, JSON 64 Kio, URL HTTP(S) bornee et erreurs filtrees. |
| `/api/suno/generate-lyrics` | Active et utilisee | Ajout 5 creations/15 min et 30 lectures/10 min par utilisateur; corps/ID bornes, erreurs brutes retirees. |
| `/api/suno/timestamped-lyrics` | Active et utilisee | Ajout ownership generation+piste, 10/10 min/utilisateur et reponse d'erreur filtree. |
| `/api/suno/generate-music-video` | Active et utilisee | Ownership deja correct; ajout 3/h/utilisateur, JSON 8 Kio et retrait de `raw`. |
| `/api/suno/repair-tracks` | Active et utilisee | Auth/ownership par requete deja presents; ajout 2/h/utilisateur pour borner la boucle fournisseur. |
| `/api/suno/credits` | Active mais usage UI non essentiel | Solde fournisseur rendu admin-only, 5/min/admin; l'UI membre ignore deja les reponses non-OK. |
| `/api/suno/callback`, `/api/suno/music-video-callback` | Actives, webhooks | Signature HMAC conservee; exemption volontaire du controle Origin. Logs du callback principal minimises. |
| `/api/ai/credits`, `/api/ai/library`, `/api/ai/library/tracks`, `/api/ai/generations*`, `/api/ai/tracks*`, `/api/ai/quota`, `/api/ai/tags/suggestions`, `/api/ai/upload-source` | Actives et utilisees | Auth et filtrage utilisateur existants; aucune nouvelle exposition fournisseur publique detectee. |
| `/api/ai/generate` | Legacy encore routable | Aucun consommateur trouve. Ajout auth web/mobile, origine, 3/10 min/utilisateur, JSON 64 Kio; fallback WAV interdit en production et erreurs/logs filtres. |
| `/api/ai/status/[taskId]` | Legacy encore routable | Aucun consommateur trouve. Suppression du fragment de cle journalise; ajout validation, ownership et 20/min/utilisateur. |
| `/api/ai/status-simple/[taskId]` | Legacy/remplacee, encore routable | Aucun consommateur trouve; deja securisee en Phase 0A (auth, ownership, validation, limite et reponse filtree). |
| `/api/ai/webhook` | Legacy encore routable | Signature HMAC ajoutee; payload et erreurs sensibles retires des logs/reponses. |
| `/api/ai/callback` | Placeholder/test legacy | Aucun effet metier; 404 en production via le guard diagnostics. |
| `/api/ai/quota/increment` | Legacy, usage non retrouve | Authentifiee, mais a supprimer ou fusionner lors du nettoyage; pas d'appel fournisseur direct. |
| `/api/ai/test`, `/api/ai/test-auth`, `/api/ai/debug-status/[taskId]` | Test/debug | 404 en production; session complete et details d'erreur retires de `test-auth`. |

L'ancien `/api/ai/generate` creait auparavant une ligne avec un task ID interne `gen_*` apres avoir recu un vrai task ID Suno. Les nouvelles generations creees par cette route stockent desormais le vrai task ID. Les anciennes lignes ne sont pas migrees dans cette phase et peuvent donc rester impossibles a rapprocher automatiquement du fournisseur.

## Uploads publics et semi-publics

| Surface | Pourquoi / type | Protections apres Phase 0B |
| --- | --- | --- |
| `POST /api/media/upload?kind=star-academy-audio` | Public pour candidater; un fichier audio | 30 Mo, 1 flux, concours ouvert + echeance, extension/MIME/`ffprobe`, stockage local, 3 uploads/h/IP. |
| `POST /api/star-academy/apply` | Public; reference vers l'audio local deja charge | JSON 64 Kio, tailles de champs, URL HTTP(S), reference locale signee, fenetre concours, plafond global, doublon email, 5/j/IP + 2/j/email. |
| `POST /api/star-academy/apply-staff` | Public; aucun fichier | JSON 64 Kio, tailles de champs, URL HTTP(S), role/age, concours ouvert, doublon, 5/j/IP + 2/j/email. |
| `POST /api/support` | Public; aucun fichier/piece jointe | JSON 16 Kio, message 10-5 000 caracteres, sujet allowliste, URL HTTP(S), 5/15 min/IP + 3/h/email. |
| Uploads `audio`, covers, profils, posts, messages, clips, IA et editoriaux | Authentifies (editorial admin); medias locaux | Ownership dans le nom signe, limites par type et validation de contenu. La route centrale `/api/media/upload` est aussi limitee a 30/h/utilisateur. |
| Uploads Meteo | Authentifies; une image de bulletin | 10 Mo, validation image et ownership local. Pas de surface publique trouvee. |
| Ancien `POST /api/upload` | Authentifie; finalise surtout des references locales | Verifie ownership audio/cover; la branche multipart ne stocke pas de fichier et renvoie une reponse de simulation legacy. |

Les routes specialisees `posts/upload-image`, `messages/upload-image` et `users/[username]/upload` restent authentifiees et bornees en taille par `localMediaStorage`, mais n'ont pas encore de quota temporel propre lorsqu'elles contournent `/api/media/upload`.

## Diagnostics et headers

Le middleware bloque en production tout premier segment commencant par `debug`, `test`, `diagnostic`, `dev`, `playground` ou `sandbox`. Les neuf pages signalees (`/debug*`, `/test-*`) restent disponibles en developpement. Les API nommees debug/test utilisent `diagnosticsEnabled()`, qui ne peut plus etre reactive par variable d'environnement en production.

Headers globaux ajoutes :

- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(self), geolocation=(), browsing-topics=()`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains` uniquement en production
- `X-Frame-Options: SAMEORIGIN` et `Content-Security-Policy: frame-ancestors 'self'` sur les pages ordinaires
- `/embed/*` conserve `Content-Security-Policy: frame-ancestors *` et aucun `X-Frame-Options`

Aucune CSP complete n'est activee dans cette phase. Avant de la definir, il faut inventorier au minimum `media.synaura.fr`, Cloudinary historique, Google Auth et avatars, Stripe, les domaines audio/image Suno, Mux/HLS, WebSocket, Web Push et les endpoints analytics. Le seul usage CSP ajoute est `frame-ancestors`, isole des directives de chargement et donc peu susceptible de casser l'application.

## Origin / CSRF

`rejectUntrustedMutationOrigin` est applique aux mutations auth sensibles, aux formulaires publics, aux uploads centraux et aux generations Suno modifiees. Une origine explicite doit correspondre a l'origine de la requete, `NEXTAUTH_URL`, `NEXT_PUBLIC_SITE_URL` ou `ALLOWED_WEB_ORIGINS`; `Sec-Fetch-Site: cross-site` est refuse. L'absence d'`Origin` reste acceptee pour les applications natives et les appels serveur.

Cette protection n'est volontairement pas globale. Les webhooks Suno et Stripe doivent rester exempts et etre authentifies par signature. Une phase ulterieure devra inventorier les autres POST/PATCH/PUT/DELETE a cookie et appliquer le helper au cas par cas, puis ajouter des tests de non-regression mobile et webhook.

## Risques restant ouverts / Phase 0C

1. Le rate limiter reste local au processus Node : il faudra un compteur distribue avant tout passage multi-worker ou multi-instance. Le reverse proxy doit ecraser `X-Real-IP`/`X-Forwarded-For` pour eviter leur spoofing direct.
2. Les task IDs de `generate-lyrics` ne sont pas enregistres avec un proprietaire. L'auth et les limites reduisent le risque, mais une table/colonne ou un jeton signe de suivi serait necessaire pour un ownership durable.
3. `upload-cover` accepte des sources HTTP(S) distantes parce que les remixes actifs utilisent des URLs Suno. Ajouter un identifiant de piste source au contrat permettrait de verifier l'ownership sans casser ce parcours.
4. Le lien mobile de changement d'email est signe et expire apres 30 minutes, mais n'est pas marque comme utilise en base. Ajouter un `jti` one-shot necessite un stockage/migration ciblee.
5. Le callback OAuth mobile transporte encore access et refresh tokens dans le fragment d'une URL de deep link. Le fragment evite les logs de query string HTTP, mais une remise de code court a usage unique limiterait aussi l'exposition au niveau OS et implique une evolution du client natif.
6. Les anciennes lignes creees par `/api/ai/generate` avec `gen_*` ne sont pas migrees.
7. Ajouter des quotas temporels aux routes d'upload specialisees authentifiees qui ne passent pas par `/api/media/upload`, ainsi qu'un nettoyage periodique des medias orphelins.
8. Etendre progressivement le controle Origin aux mutations a cookie restantes apres inventaire des integrations cross-origin et des webhooks.
9. Etablir une CSP en Report-Only apres capture des domaines reels, puis la rendre bloquante directive par directive.
