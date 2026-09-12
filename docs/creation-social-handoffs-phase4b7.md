# Phase 4B.7 — Creation handoffs & social spaces

Baseline d'origine : `2a6ab2a834146494c795650840b673c411206a02` (4B.6). Candidate validée par l'utilisateur ; commit et déploiement canonique autorisés le 12 septembre 2026. Les résultats ci-dessous décrivent la validation pré-déploiement ; le smoke production fera l'objet d'un rapport de livraison distinct.

## Audit préalable au code

Matrice établie avant toute modification applicative 4B.7. Sources : routes et composants actuels, contrat `liveContinuity.ts`, contrôleur de surfaces et Actions 4B.5. Audit navigateur authentifié, build production local, 1440×900 : neuf routes ouvertes, zéro erreur JavaScript (`artifacts/handoffs-phase4b7/baseline-routes.json`). Ces ouvertures directes ne constituent pas encore une preuve de restitution par Back.

Dans la colonne audio, « neutre » décrit l'intention du code de navigation ; les invariants doivent encore être mesurés en E2E. Le snapshot existant ne contient aucun état audio à restaurer.

| Origine / action | Destination | Paramètres / source | Return token actuel | Audio | Back actuel / problème | Cible |
| --- | --- | --- | --- | --- | --- | --- |
| Live / Créer | Menu de choix existant, puis route ; `/create` est un hub autonome | Aucune source implicite | Perdu par les boutons du dock | Neutre | Back navigateur conserve l'entrée Live ; retour du hub pointe `/` | Conserver le menu, transmettre l'origine aux routes ; retour contextualisé du hub |
| Live / Créer avec l'IA | `/ai-generator` | Aucun par défaut | Absent | Neutre | Aucun retour local ; logo accueil générique | Retour au Live conditionnel |
| Live / Remix dans Actions | `/ai-generator` | `mode=remix`, `sourceTrackId`, `sourceTrackType` | `liveReturn` déjà fourni | Neutre | Actions dépile les surfaces ; destination ignore le token | Consommer le token, garder exactement les paramètres existants |
| Live / Studio | Le lien nommé Studio mène à `/ai-generator` ; pas d'entrée Live directe vers `/studio` | Sans source | Absent | Neutre | Deux produits nommés Studio ; Studio IDE sans retour | Clarifier le libellé confirmé ; supporter le retour de `/studio`, sans fusion |
| Live / Publier un son | `/upload` | Éventuel `challengeId` depuis Create | Perdu | Preview secondaire existante | Annuler/succès/retour poussent `/` | Préserver nettoyage média ; retour d'origine quand disponible |
| Live / Utiliser ce son, Actions clip | `/clips/new` | `trackId`, `trackType` (`track` / `ai_track`) | Présent dans Actions, absent dans l'autre entrée | Preview secondaire existante | Annuler → `/`, succès → `/?filter=clips` (redirect accueil perd les params) | Identité source inchangée ; retour Live déterministe si contexte valide |
| Create / choix de création | AI, Upload, Clip, variation | `challengeId`, `intent`, source selon choix | Non propagé | Neutre | Les liens du hub perdent l'origine | Propagation bornée sur les liens de travail |
| Live / Messages | `/messages` | Aucun | Absent | Notes vocales coordonnées existantes | Inbox sans retour contextualisé | Retour au Live ; garder Messages en route |
| Profile / Message | `/messages/[conversationId]` ou inbox requests | ID réel conversation existante / créée | Absent | Neutre | Retour conversation force inbox, pas le profil | Retour au profil d'origine pour entrée directe ; inbox conserve sa navigation normale |
| Live / Notifications | `/notifications` | Aucun | Absent | Neutre | Route Activité sans retour contextualisé | Garder origine Live |
| Notifications / ouvrir objet | `action_url` canonique | Dépend du type, URL existante | Non propagé | Neutre | Retour navigateur possible ; aucune preview contextuelle n'est branchée dans cette page | Conserver politique canonique existante et origine ; ne pas fabriquer de nouvelle surface |
| Live / Clubs | `/community` | Aucun | Absent | Neutre | Liens vers clubs perdent le contexte | Retour au Live et propagation vers club |
| Community / club | `/community/[club]` | Slug existant : feedback, collab, remix, ai | Absent | Neutre | Retour local Community | Conserver hiérarchie + origine |
| Live / Events, Pulse | `/city` | Aucun | Absent | Neutre | Retour accueil non contextualisé | Retour au Live |
| City / Event | Détail local existant dans `/city` ; pas de route `/events` | Événement réel ; participation peut mener à Upload | Absent | Média existant | Modal événement appartient à City | Ne pas réécrire City ; transporter l'origine vers Upload |
| Live / Stats, Boosters | Pas de lien réel observé dans Live ; liens de BottomNav legacy non monté | — | — | — | Hors parcours Live établi | Exclus de cette candidate |

## Décision de navigation AI / Studio (avant code)

- `/ai-generator` : workspace principal « Créer avec l'IA », formulaire de génération, remix et bibliothèque IA. Les entrées Live/Create qui l'appellent « Studio » sont ambiguës et peuvent être renommées, sans modifier son interface de travail.
- `/studio` : workspace distinct « Studio IDE », timeline/outils avancés existants. Il reste autonome. Aucune fusion ni nouvel import depuis Live. Une entrée directe sans contexte n'affiche pas de faux retour Live.
- Retour : explicite quand un snapshot Live valide existe ; sinon navigation habituelle. Générer dans AI/Studio ne doit pas provoquer une sortie automatique ajoutée par cette phase.

La navigation ajoute deux liens légers vers les routes déjà existantes : « Tous les outils de création » dans le menu Créer, et « Ouvrir Studio IDE » dans le hub Create. Ils rendent les espaces autonomes accessibles sans importer leur code dans Live. Aucun nouvel outil de création.

## Contrat proposé

Réutiliser `liveReturn=<snapshotId>` déjà produit par Actions 4B.5. Identifiant borné et non sensible ; contenu stocké par 4B.1 dans l'onglet, limite de quatre snapshots et expiration de trente minutes. Aucun nouveau store global, provider ou listener global. La validité dépend du snapshot existant, pas seulement de la forme de l'URL.

`origin=live`, `liveSnapshotId` et `returnPath=/live` se déduisent du token validé. L'intention et la source restent dans les paramètres déjà consommés (`mode`, `sourceTrackId/sourceTrackType`, `trackId/trackType`, `intent`, `challengeId`), sans duplication. Un clip existant n'est jamais converti en source track par la navigation.

Un retour explicite vers `/live?liveReturn=…` doit rattacher le snapshot valide à l'entrée d'historique avant de monter Live. Back navigateur conserve l'entrée précédente. Les surfaces dépilées avant une sortie volontaire restent fermées (mécanisme Actions existant). Token malformé, expiré ou inconnu : retour frais sans restauration simulée.

Pour Profile → Messages, un chemin local de profil strictement autorisé peut fournir le retour logique ; il n'autorise aucune redirection externe. La navigation interne inbox/conversation reste distincte de cette origine.

## Validation à réaliser

Tests ciblés contrat/expiration/source/history, parcours navigateur authentifiés, captures ciblées et mesures de bundle. Aucune publication, message ou permission utilisateur ne sera modifié pour fabriquer un PASS. Android/Gboard réel, NVDA réel, Cloudinary 401 historiques et permissions remix/clip sur vraie source autorisée restent des réserves séparées.

## Politique Notifications

| Types | Ouverture | Retour |
| --- | --- | --- |
| `new_follower` | Profil canonique fourni par `action_url` | Back → Activité → Live |
| `new_like`, `new_comment`, `new_track_followed`, `like_milestone`, `view_milestone`, `clip_used_source` | Morceau/source canonique existant ; la page Activité ne branche actuellement aucune preview | Back → Activité ; aucune lecture ajoutée |
| `post_like`, `post_comment` | Post ou discussion Community selon URL fournie | Back → Activité ; origine propagée aux routes sociales prises en charge |
| `new_message`, `message_request`, `message_request_accepted` | Inbox/conversation canonique ; conserver `tab`/`room` | Back interne Messages puis retour Live |
| `remix_pending_approval`, `remix_approved`, `remix_rejected` | URL canonique existante, permissions backend inchangées | Back, ou retour Live si destination de travail prise en charge |
| `boost_reminder`, `admin_broadcast`, `weekly_recap`, `general` | URL existante si présente ; pas d'inférence d'entité ni nouvelle surface | Back navigateur ; pas de retour injecté dans une URL externe |

Le panneau Notifications avait un `window.location.href` sur une notification : remplacement ciblé par navigation Next, pour éviter le rechargement du document et la rupture du player. Aucune nouvelle preview inventée, aucun changement de marquage lu/suppression ou subscription.

## Cancel / succès / sortie manuelle

- Create / variation : choix explicite vers la route existante ; challenge et source restent transportés par les paramètres actuels. Sortie par Back ou retour contextuel.
- AI / Studio IDE : génération et sauvegarde restent dans le workspace. Cette phase n'ajoute ni publication, ni redirection après génération, ni lecture de la source. Retour au Live explicite lorsque le token est valide.
- Upload : annulation garde le nettoyage des fichiers temporaires existant ; succès conserve le signal `fromUpload`. Les redirections déjà présentes reviennent au snapshot Live valide, sinon à leur destination habituelle. La coordination du preview secondaire n'est pas modifiée.
- Clip : la publication en arrière-plan et son nettoyage média restent identiques. Retour Live si contexte valide ; sinon fallback historique `/?filter=clips`. L'ouverture d'un clip publié n'est pas confondue avec sa création.
- Messages : inbox → conversation conserve le retour interne inbox. Profile → conversation retourne au profil explicitement identifié. Les mutations de demandes, groupes, messages, notes vocales et les abonnements ne sont pas modifiés.
- Community / City : liens locaux propagent l'origine pendant le travail ; Discover/Library/Profile principaux restent des changements volontaires de contexte. Le détail Event existant dans City reste tel quel.

## History / audio / performance

Les helpers ne lisent que l'URL, le snapshot 4B.1 et l'entrée d'historique. Aucun état audio n'y entre. Le retour explicite utilise `replace` pour ne pas empiler une nouvelle visite de la route quittée. Back natif garde son fonctionnement. Actions continue à dépiler ses surfaces avant le handoff ; aucun changement du contrôleur ou de cette logique.

Les liens vers des workspaces ne préchargent pas ces routes. Aucun import de workspace dans Live ou les surfaces, aucun provider ou listener global ajouté. Les compteurs Messages/Notifications déjà présents dans le shell restent autorisés : ce ne sont pas des queries du workspace Conversation.

## Validation finale de la candidate

Type-check et build production local final **PASS**, build ID `fL8UOVo5kd-yIy7mxYzpJ`. Suite complète : **262/262 PASS**, dont 20 tests ciblés 4B.7 (preuve `artifacts/handoffs-phase4b7/unit-tests.log`). `git diff --check` PASS.

Une première passe UI dev a été invalidée par un rechargement complet Fast Refresh pendant la compilation de Create. Elle n'est pas utilisée comme preuve de continuité. Le rejeu ci-dessous porte sur le build production local final.

Ce rejeu est terminé : **109/109 contrôles navigateur PASS**, sur `next start`, compte E2E existant isolé dans un navigateur jetable. Aucune génération/publication ni message envoyé ; analytics plays/events/impressions et accusés de lecture des notifications interceptés dans ce seul navigateur pour éviter des signaux persistants.

| Parcours réellement joué | Restitution / preuve |
| --- | --- |
| Live → menu Créer → Create → Back | Même carte d'index 1, filtre, queue ; aucun item 0 transitoire |
| Live → AI → Retour au Live | Même contexte, aucune commande audio |
| Live → Upload → Back | Même contexte ; bouton retour contextualisé dans l'emplacement existant |
| Live → Clip New → Retour au Live | Même contexte ; aucune publication déclenchée |
| Live → Messages → Back | Inbox réelle vide ; même contexte Live |
| Live → Notifications → cible réelle → Back → Back | Cible canonique réellement cliquée ; origine maintenue sur Activité |
| Live → Community → club Feedback → Back → Back | Navigation/token/retour PASS ; **chargement des posts du club en réserve (500 préexistant)** |
| Live → City/Events → Back | Même contexte Live ; pas de route Event artificielle |
| Live → Create → Studio IDE → Retour au Live | Workspace réel ouvert ; même contexte Live |
| Live → Profile Peek → Actions → Details → Track → Back | Même ancre ; aucune ancienne surface rouverte |
| Mobile 390×844 : AI, Create, Messages | Retour lisible et accessible ; continuité conservée |
| Messages mobile, reduced motion, retour clavier | Préférence réellement activée ; retour par Enter |
| Zoom navigateur natif 200 % : Create et AI | Réglage Chromium `tabs.setZoom(2)` confirmé ; pas de débordement horizontal du document/retour ; activation clavier |
| Token inconnu dans Studio, puis retour Live inconnu | Pas de faux retour affiché ; fallback Live sans crash et token consommé |

Sur les 14 allers-retours instrumentés : même file d'attente lue via l'UI Queue, même filtre, même carte, **0 play / 0 pause / 0 load / 0 seek supplémentaires sur l'élément audio principal**, temps qui avance et même source. Le focus de retour est systématiquement `synaura-scroll-feed`, conformément à 4B.1. Les paramètres source sont testés en contrat, jamais reconstruits depuis une autre entité.

Aucune exception JavaScript dans la passe. Les erreurs HTTP sont distinguées ci-dessous : cela n'est **pas** une déclaration « zéro erreur réseau ».

### Réserves et diagnostic hors handoff

- **Community Feedback : GET `/api/community/posts?category=feedback&limit=30&sort=recent` → 500** reproduit sur `https://synaura.fr` et `http://localhost:3000`. Log local : `Relation PostgreSQL introuvable entre forum_posts et user_id` (`PG_ERROR`). La requête relationnelle/fallback dans API et DB n'a pas été modifiée par 4B.7. Les cartes/retours du club sont navigables, mais la lecture de ses posts n'est pas validée. Correctif API/compatibilité relationnelle à décider séparément ; aucun changement DB ou permissions fait ici.
- `/api/suno/credits` → 403 : guard administrateur attendu avec le compte E2E non admin, déjà documenté en 4B.6.
- Quatre URLs Cloudinary historiques → 401 pendant cette passe ; pas de correction média.
- Le compte E2E n'a pas de conversation. Profile → Messages → conversation : contrat de retour et branchements testés/revus, mais pas de conversation réelle ni notes vocales/pièces jointes envoyées pour fabriquer un PASS. Les listeners, subscriptions et mutations existants restent inchangés.
- Sur le morceau observé dans les Actions imbriquées, Remix et Clip ne sont pas autorisés/affichés. Aucun droit modifié. Le scénario imbriqué réel a donc utilisé Details → Track ; Remix/Clip → workspace reste prouvé au niveau URL/return contract, pas au niveau génération/publication autorisée.
- Succès réels Upload/Clip/AI non exécutés : destinations des callbacks vérifiées, pas de fichier ajouté ni génération payante. Le détail d'un Event et sa participation ne sont pas une création E2E validée ; la route canonique City et son retour le sont.
- Android/Gboard réel et NVDA réel non testés. Captures mobile = viewport de navigateur desktop, pas téléphone physique.
- Les titres de document ont été relevés : `Synaura` pour les workspaces hérités, `Events - Synaura Pulse` pour City, `Live Synaura` pour Live. Les titres génériques hérités ne sont pas présentés comme une refonte d'accessibilité complète.

### Performance

Mesure identique des chunks client listés pour `/live/page` dans `.next/app-build-manifest.json` (somme gzip par chunk) :

| | Baseline 4B.6 | Candidate 4B.7 | Écart |
| --- | ---: | ---: | ---: |
| Octets JS | 1 464 547 | 1 469 330 | +4 783 (+0,33 %) |
| Octets gzip | 431 461 | 432 941 | +1 480 (+0,34 %) |

Les vendors partagés restent identiques. Aucun chargement AI library/generations, Suno, remix sources ou conversations Messages avant navigation dans le gate. Les appels préexistants du Live (Pulse `/api/city`, compteurs Messages/Notifications, feed) restent distincts des queries workspace. Aucun provider/listener global nouveau, aucune modification du cache partagé métier. Ce relevé de bundle n'est pas une mesure de temps réseau ni un benchmark d'ouverture chaude 4B.5.

### Captures et preuves

- [Galerie de revue ciblée](../artifacts/handoffs-phase4b7/gate/review.html)
- [Résultats navigateur complets](../artifacts/handoffs-phase4b7/gate/results.json)
- [Create desktop](../artifacts/handoffs-phase4b7/gate/desktop-create.png), [AI desktop](../artifacts/handoffs-phase4b7/gate/desktop-ai.png), [Studio IDE](../artifacts/handoffs-phase4b7/gate/desktop-studio.png), [Messages](../artifacts/handoffs-phase4b7/gate/desktop-messages.png)
- [Create mobile](../artifacts/handoffs-phase4b7/gate/mobile-create-390.png), [AI mobile](../artifacts/handoffs-phase4b7/gate/mobile-ai-390.png), [Messages reduced motion](../artifacts/handoffs-phase4b7/gate/mobile-messages-reduced-motion.png)
- [Create zoom 200 %](../artifacts/handoffs-phase4b7/gate/zoom200-create.png), [AI zoom 200 %](../artifacts/handoffs-phase4b7/gate/zoom200-ai.png)
- [Build](../artifacts/handoffs-phase4b7/build.log), [tests](../artifacts/handoffs-phase4b7/unit-tests.log), [bundle avant](../artifacts/handoffs-phase4b7/bundle-baseline.json), [bundle après](../artifacts/handoffs-phase4b7/bundle-candidate.json)

Captures Create/AI/Studio/Messages desktop, mobile et zoom inspectées visuellement : affordances de retour visibles, aucun redesign. Les captures des autres routes servent de diagnostic de parcours, pas de nouvelle direction artistique.

## Périmètre Git et décision

Modifications limitées aux helpers de handoff, liens/retours dans les routes et shell existants, entrée Live avant montage, libellés de navigation confirmés et tests/documentation. Zéro diff dans AudioCore/providers, `liveContinuity.ts`, Context Surface Controller, Profile Peek, Comments/Moments, Actions ou DB/API. Aucune modification 4B.7 des apps natives : les neuf modifications utilisateur/natives préexistantes sont préservées, ainsi que tous leurs artifacts hors périmètre. Index vide ; aucun commit, push, tag ou déploiement. HEAD reste `2a6ab2a834146494c795650840b673c411206a02`.

Scan des fichiers de cette candidate : aucun motif de clé privée/credential détecté ; aucun environnement, clé ou dump ajouté. Cela ne certifie pas tout l'historique du dépôt.

**Candidate de navigation 4B.7 validée par l'utilisateur**, avec les réserves explicites ci-dessus. Commit/déploiement autorisés, suivis du smoke production ciblé. Le 500 préexistant des posts Community reste exclu de ce commit : suivi séparé documenté. L'ouverture de 4B.8 est conditionnée à la bonne santé de cette livraison.

PHASE 4B.7 CREATION + SOCIAL HANDOFFS CANDIDATE READY
