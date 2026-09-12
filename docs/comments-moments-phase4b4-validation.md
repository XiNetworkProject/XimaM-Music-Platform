# Phase 4B.4 — Addendum de validation finale

Date : 12 septembre 2026.

## Autorisation de livraison après revue

Après validation technique et information explicite sur l'absence de téléphone
accessible, l'utilisateur a demandé **« commit etdeploie »**. La livraison 4B.4
est donc autorisée, sans déclarer validé le clavier Android réel. Aucun changement
créatif ou architectural supplémentaire n'accompagne cette livraison.

- Tests existants : **228/228 PASS** ; type-check : **PASS**, relancés avant commit.
- Build local : PASS au gate ; le workflow canonique reconstruira le commit isolé.
- Clavier Android/Gboard réel : **NON TESTÉ**, réserve manuelle conservée.
- NVDA réel : **NON TESTÉ**, malgré les vérifications clavier/DOM.
- Cloudinary HTTP 401 : suivi séparément dans
  [le ticket médias historiques](issues/cloudinary-legacy-media-401.md), sans
  masquer les erreurs du runner ni modifier les médias dans 4B.4.
- Clip SSD : smoke authentifié création/lecture/suppression prévu immédiatement
  après déploiement ; seul le commentaire E2E créé par ce smoke sera supprimé.
- Post : replies et likes de commentaires restent absents du contrat.

Décision de livraison : **GO sur autorisation explicite**, avec ces limites
documentées. Le NO-GO ci-dessous décrit le gate exhaustif historique, pas un PASS
mobile obtenu depuis. Les résultats effectifs de livraison seront consignés dans
un rapport opérationnel séparé après la bascule. Aucune Phase 4B.5.

## Gate historique : NO-GO pour une validation exhaustive

Les parcours fonctionnels supplémentaires passent. Trois défauts réellement
observés ont reçu une correction minimale. Le contrôle strict de console reste
rouge à cause de médias historiques Cloudinary en HTTP 401. Le clavier mobile OS,
NVDA et les écritures Clip sur le SSD réel ne sont pas déclarés validés.

Ce document est prêt pour revue ; cela ne vaut pas autorisation de déploiement.
Aucune Phase 4B.5 commencée.

## Environnement et portée des preuves

- Chromium desktop **avec fenêtre réelle**, compte E2E existant, candidate Next
  locale et PostgreSQL réel via le tunnel SSH déjà autorisé.
- Zoom **natif Chromium 200 %**, appliqué avec `chrome.tabs.setZoom` dans une
  extension de test installée seulement dans le profil jetable du runner.
  Ce n'est ni `transform: scale`, ni un zoom CSS, ni une simple émulation DPR.
  API native : facteur 2 ; DPR **1,25 → 2,5** ; viewport CSS
  **1427×788 → 713×394**. L'outil Windows ne pouvait pas cibler cette fenêtre
  (`window ... no longer belongs to Chrome; current owner is Chrome`).
- Le scénario reproductible impose seulement l'ordre de **trois vrais morceaux
  publics** dans la réponse de ranking du navigateur de test. Commentaires,
  réactions et peaks proviennent des endpoints réels ; aucun faux signal social
  ni faux peak n'est ajouté à l'application.
- Retard artificiel de **3500 ms** sur comments/reactions/waveform. Les actions
  utilisent les boutons DOM de la vraie UI, avec attente de fin de fermeture et
  de scroll animé. Ce n'est pas une validation des gestes tactiles physiques.
- Mobile : viewport desktop **390×844**, pas un téléphone.

## Réserves fermées

### Changement rapide d'entité

Runner : `scripts/comments-final-validation-gate.mjs`.

1. A Comments → fermer → B Comments → fermer → C Comments avant expiration du
   retard réseau : C demeure affiché après les réponses tardives.
2. Les requêtes A/B abandonnées sont enregistrées `net::ERR_ABORTED`. C n'affiche
   aucun commentaire A/B. Les identifiants affichés sont comparés à l'endpoint C.
3. Les 90 barres affichées sont comparées aux vrais peaks de C, pas à un dessin
   de référence : PASS. C ne reprend pas le marker temporel présent sur A.
4. Brouillon C → A → brouillon A → fermer → B → A chaud : aucun transfert de
   brouillon ; le texte propre à A est restauré.

A = `track_1758481606741_trwopq702`,
B = `track_1773789112971_0egfpy0i2`,
C = `track_1782517870229_4_vjgv7x3`.

### Zoom 200 % et Profile Peek imbriqué

Conversation, Moments, waveform, cluster, auteur → Profile Peek → Back et
composer multilignes ont été rejoués au zoom natif. Aucun débordement horizontal
du panneau Comments ou Profile Peek mesuré. Le composer et le CTA de fin restent
atteignables par défilement dans la fenêtre courte.

Avant correction : conversation réduite à **16 px**, footer descendant jusqu'à
**576 px** dans un viewport de **394 px**. Après correction : conversation
**128 px minimum**, défilement permettant d'atteindre le composer et tout le
footer. La sheet garde sa hauteur nominale ; son contenu n'est plus écrasé.
La surface entière peut défiler en faible hauteur : tout n'est pas simultanément
visible à 200 %. Le panneau conversation conserve son propre scroll.

Retour imbriqué testé à taille desktop puis à 200 % : **texte, onglet Moments,
cluster sélectionné, focus auteur et état audio conservés**. Back supplémentaire
revient à Live et restitue le focus au bouton Comments du même morceau.

### Audio

Instrumentation de `HTMLMediaElement` avant chargement, limitée aux éléments
AUDIO : compte les appels natifs `play`, `pause`, `load` et écritures `currentTime`.

| Action | Résultat mesuré |
| --- | --- |
| Ouvrir Comments | 0 play, 0 pause, 0 seek, 0 load |
| Cliquer un marker | exactement 1 seek ; 0 play/pause/load |
| Fermer Comments | 0 mutation native audio |
| Peek puis Back | aucune mutation native ; même instance, track, génération, queue et état de lecture |
| Route Track | 1 élément musical déclaré par AudioCore ; aucun `audio[controls]` secondaire |

Queue et génération restent identiques lors des ouvertures/fermetures : aucun
reset observé. Ce contrôle d'état n'est pas un espion sur chaque appel interne
de méthode du moteur. Les tests AudioCore existants passent également. Aucun
fichier AudioCore, contrôleur de surfaces ou contrat d'historique modifié ici.

### Données, filtrage et réaction temporelle

Runner opt-in : `scripts/comments-final-data-gate.mjs` ; preuves dans
`comments-moments-phase4b4-captures/final-validation/data-results.json`.

- Parent temporel de test à 12 s, identifié par UUID/préfixe et compte E2E,
  inséré directement pour éviter une notification à un autre créateur.
  La création **POST** temporelle avait déjà passé le gate initial décrit dans
  `comments-moments-phase4b4.md` ; elle n'a pas été répétée ici.
- Reply via POST réel, like puis unlike réels : PASS.
- Suppression auteur du reply puis du parent via les DELETE réels : PASS.
- Lecture anonyme après suppression : aucun parent/reply masqué dans `/comments`,
  `/comments/moderation?view=public`, la projection timestampée, ni en demandant
  frauduleusement `view=creator&includeDeleted=true&includeFiltered=true`.
- État de filtre créateur appliqué **uniquement à la fixture** en SQL : la lecture
  anonyme exclut le parent et son reply. Le POST de modération avec le compte
  non-créateur est correctement refusé 403. Cela ne remplace pas une session
  interactive de créateur autorisé.
- Réaction `production` à 137 s : absence préalable vérifiée, POST réel, lecture
  réelle, puis suppression SQL strictement bornée à l'ID retourné, auteur,
  morceau, type et timestamp. **0 réaction de test restante**.
- Nettoyage transactionnel des deux seules lignes de commentaires de ce run,
  de leurs marqueurs de modération et likes : **0 commentaire de test restant**.
  Suppression définitive de ces fixtures ; aucun contenu utilisateur préexistant
  supprimé. Pas de notification de nouveau parent créée par ce run.

Ces observations prouvent le filtrage des chemins testés, pas une garantie absolue
sur tout endpoint futur. Les contraintes DB sont inchangées.

## Trois défauts observés et corrections bornées

1. **Fenêtre courte/zoom** : débordement réel du footer et conversation écrasée.
   `app/globals.css` autorise le scroll de `.comments-surface` et garantit 8rem
   au panneau sous 600 px de hauteur. Aucun changement au design normal 390×844
   ni à la hauteur 82dvh.
2. **Console du compteur** : centaines d'avertissements TanStack « No queryFn »
   malgré `enabled: false`. `lib/commentsClient.ts` déclare `queryFn: skipToken`.
   Même clé, même cache, même fallback ; aucune requête ajoutée.
3. **Cache waveform** : POST réel renvoyant 500 `invalid input syntax for type json`.
   La colonne existante `track_waveforms.peaks` est JSONB, alors que pg sérialise
   un tableau JS en tableau PostgreSQL. La seule correction dans
   `app/api/tracks/[id]/waveform/route.ts` est `JSON.stringify(peaks)` à l'écriture.
   Réponse HTTP toujours en tableau, même PK, mêmes nombres et même waveform.
   Contrôle réel après correction : cache C lisible, **180 peaks**, durée 106,16 s.
   Le cache contient le calcul réel du navigateur, aucun signal synthétique.

Trois tests de non-régression ajoutés. Pas de refactorisation, pas de nouvelle
fonctionnalité, pas de changement de contrat DB/API, de modèle comments/moments,
de Profile route ou d'AudioCore.

## Réserves restantes — ne pas transformer en PASS

| Réserve | État / suite nécessaire |
| --- | --- |
| Android Chrome et clavier OS | Aucun appareil dans `adb devices -l`. Focus, multilignes, ajout/retrait timestamp, brouillon et scroll derrière vérifiés en émulation seulement. Clavier réel, visualViewport sous clavier, gestes, safe-area matérielle et stabilité de sheet restent à tester sur appareil. |
| NVDA | Non détecté en processus, commande, emplacements usuels ou registre de désinstallation. Aucun test lecteur d'écran réel déclaré. Les preuves clavier/focus et ARIA ne valent pas une écoute NVDA. |
| Console/médias historiques | Dernier runner strict en échec sur HTTP 401 de trois anciens médias Cloudinary ; détails ci-dessous. Aucun `pageerror`. Ne pas déclarer une console entièrement propre. |
| Modération créateur authentifiée | Compte E2E non créateur du morceau testé ; refus 403 et filtrage réel testés, mais pas de clic de suppression sous une session créateur autorisée. |
| Clip SSD | Gate précédent : lecture de l'endpoint local, identité `clip:` et absence de redirection automatique vers le track source PASS. Le SSD distant n'est pas monté : pas de validation fictive des écritures ni de son contenu réel. |

Smoke Clip authentifié **après un déploiement ultérieurement autorisé** : ouvrir
un vrai clip publié depuis Live, vérifier son ID et sa conversation propre, créer
un commentaire E2E identifié, vérifier la persistance SSD puis le supprimer et
relire. Vérifier Back et absence de redirection automatique. Ne pas exécuter ce
smoke avant autorisation de déploiement.

### Console résiduelle

Le dernier run n'a plus les erreurs « No queryFn » ni le POST waveform 500.
Il s'arrête volontairement au contrôle strict `no console error` : HTTP 401
pour les anciens avatars `ximamoff_avatar_1758745905.png`,
`keurlilamelo_avatar_1781610003.jpg` et la cover
`cover_1758481606881_hx28s79n2.jpg` sous `res.cloudinary.com/dtgglgtfx`.
Les trois URLs renvoient aussi 401 hors de la candidate. L'API utilisateur de
production fournit encore exactement cette URL d'avatar XimaMOff. L'API Track
production fournit, elle, la cover canonique `media.synaura.fr` : on ne déduit
pas de l'échec du fallback local que la cover de production est cassée.

Aucune modification de média, de donnée utilisateur ou de configuration CDN
n'a été faite pour faire artificiellement passer le gate. Ces erreurs sont
conservées dans les preuves ; leur traitement ciblé doit être décidé séparément.
Les premiers essais du runner ont aussi rencontré une compilation à chaud Next
et des clics pendant l'animation de fermeture : ce ne sont pas présentés comme
des défauts de la candidate. Le runner final attend ces transitions.

## Post : contrat conservé

Gate dédié précédent PASS conservé. Conversation, brouillon, fermeture/Back et
identité Post vérifiés ; **aucun ajout de replies/likes de commentaires Post**,
absents du contrat DB. Aucun moment ou timestamp Post inventé.

## Captures et preuves

Répertoire `docs/comments-moments-phase4b4-captures/final-validation/` :

- `results.json` : dernier run, assertions fonctionnelles PASS et échec console
  explicite, liste `httpErrors` ; ne pas le qualifier de PASS global.
- `data-results.json` : PASS et cleanup des fixtures.
- `zoom-before-results.json`, `desktop-conversation-native-200-before.png` : bug
  réellement observé avant correction.
- `desktop-before-native-zoom.png`, `desktop-conversation-native-200.png`,
  `desktop-moments-native-200.png`, `desktop-cluster-native-200.png`,
  `native-200-nested-profile.png`, `desktop-composer-native-200.png`.
- `mobile-conversation-390.png`, `mobile-moments-390.png`,
  `mobile-composer-focused-no-os-keyboard.png` : explicitement sans clavier OS.

Les captures antérieures desktop/cluster/Profile Peek et mobile ont été revues ;
aucune nouvelle passe artistique. Les nouvelles captures documentent uniquement
les contrôles et la correction de débordement.

## Gate technique et production

- Suite entière `node --experimental-strip-types --test tests/*.test.mjs` :
  **228/228 PASS**, zéro skip (dont DB/Phase1B, sécurité, AudioCore et contrats Live).
- Type-check : PASS. `npm run build` : PASS, compilation/types et 90/90 pages
  générées. Avertissements non bloquants Browserslist ancien et runtime edge.
- `git diff --check` : PASS ; index vide, aucun fichier staged.
- Recherche ciblée de secrets : **47 fichiers source/rapports** contrôlés, aucun
  des 13 secrets locaux non publics recherchés ni bloc de clé privée ou motif
  courant de credential trouvé. Les **149 fichiers JS/JSON/map publics du build**
  ont aussi été contrôlés contre ces valeurs : aucune correspondance. Aucun
  fichier ajouté à l'index.
- Production contrôlée en lecture seule : release
  `2c3e7c6459750d3744c1ad0cf78a4c696baae2ce`, service actif,
  `/healthz` et lecture API comments HTTP 200, disque racine **44 %**,
  `NRestarts=0`. `/live` anonyme redirige (307) vers l'entrée prévue et aboutit
  à `/` en HTTP 200 après suivi. Journal
  systemd de priorité erreur et recherche `comment_moderation` depuis le
  12 septembre : aucune entrée au moment du contrôle.

Les modifications antérieures 4B.4 restent non committées. Hors périmètre
préservé : `PLAY_STORE.md`, `capacitor.config.ts`, `synaura-app/**`, `.claude/`,
`supabase/.temp/` et anciens artefacts d'audit Live. Aucun secret, environnement,
dump ou fichier natif ajouté à l'index. Aucun tag créé.
