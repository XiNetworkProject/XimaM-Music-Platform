# Synaura V2 — refonte complète, candidate locale

État au 13 septembre 2026 : **implémentation locale en revue, validation finale non acquise**. Ce document distingue la couverture des sources, les contrôles sur fixtures et les parcours authentifiés. Une capture d’un composant n’est pas la preuve que sa route serveur fonctionne avec un vrai compte.

## Baseline et périmètre

- HEAD de départ et de travail : `d0ac45379227b4ad86042b6b8eb2156535f1b817`.
- Tag protégé existant `synaura-live-4b-baseline` : `db6f1367db4eafb62151a27ea60e14cb85efa908`.
- Aucun staging, commit, push, nouveau tag, déploiement, migration ou écriture en production.
- Les modifications utilisateur préexistantes, dont les applications natives et les documents 4B/Community, sont conservées et séparées de la candidate.
- Les endpoints, le schéma, les migrations, l’authentification serveur, le middleware, AudioCore et les dépendances ne sont pas modifiés.
- Le seul accès distant du runner de revue est la lecture publique de trois morceaux autorisés pour obtenir leurs pochettes et métadonnées ; aucun son réel, compte ou contenu persistant n’est utilisé par ces tests.

La [matrice exhaustive](synaura-v2-route-coverage.md) classe chaque route. L’[inventaire exact des fichiers](synaura-v2-files.md) distingue la refonte du travail préexistant.

## Vision et identité

Un espace nocturne éditorial, centré sur le morceau et les personnes. La profondeur vient des grandes pochettes, des proportions, des espaces négatifs et des plans superposés. Le chrome reste calme : fond noir bleuté, panneaux rares, violet froid de lecture, bleu discret et rose ponctuel. Les vues productives n’emploient pas la mise en scène de l’entrée.

Le S encerclé et le wordmark proviennent **du raster exact de la première référence utilisateur**, pas d’un symbole redessiné. La zone `125 × 35 px` est isolée dans `lib/brandV2.ts` et consommée par `SynauraLogo`. L’icône SVG locale n’est qu’une enveloppe contenant ce même raster : elle n’est pas un master vectoriel. Limite connue : définition et léger fond de l’image perceptibles à grande taille. Asset à fournir : master transparent SVG du S encerclé et du lockup, avec mêmes proportions et tracés que la référence. Ne pas vectoriser approximativement.

Les marques colorées secondaires actives ont été remplacées ; les pochettes absentes utilisent un placeholder nocturne neutre, jamais un nouveau logo. Les pochettes et avatars réels ne sont pas recolorés. `SynauraImage` donne un repli lisible en cas d’échec sans réparer ni cacher les 401 Cloudinary du réseau.

## Navigation et composition

Le socle reste celui des destinations réelles : Live, Découvrir, Créer, Bibliothèque, Profil. Sur desktop, navigation textuelle et accès Communauté ; sur mobile, dock atteignable et menu Créer partagé avec les overlays existants. Messages, Notifications et compte restent accessibles depuis le bandeau ; Communauté est aussi dans le compte mobile. Les destinations de création ne sont pas enfouies dans une arborescence nouvelle.

Une recherche globale réelle, utilisable aussi sur mobile, complète la page Search détaillée. La double navigation observée dans AI Library a été supprimée par le contrat de chrome existant, sans changer sa route ni la visibilité du lecteur. Les handoffs et leurs retours restent propriétaires de l’historique.

| Famille | Composition implémentée | Contrats conservés |
|---|---|---|
| Entry | Une scène native sticky, six chapitres, pochette partagée et couches locales ; entrée raccourcie au retour | Consentement sonore, intro 3,2 s, membre récurrent vers Live, navigation explicite, aucune commande audio au scroll |
| Live | Grand artwork séparé de l’identité, waveform et actions ; pré-Flow raccordé à la même famille | Feed hybride, item actif, filtres, pagination/virtualisation, likes/follow, lecture et Context Surfaces |
| Discover | Porte d’entrée éditoriale asymétrique, ambiances et collections de tailles variées | Classements, genres, vrais créateurs, recommandations et liens existants |
| Track | Identité et artwork, commande d’écoute, contexte musical réuni et accès au lecteur global | Un transport principal, actions, Moments/commentaires, related et métadonnées |
| Profile | Identité du créateur avant statistiques, catalogue et activité | Owner/visitor, follow, liens, tracks/clips/playlists/posts et créations |
| Library | Index personnel et reprise d’écoute, collections et recherche productive | Favoris, playlists, dossiers, récent/historique, offline existant, queue et organisation |
| Playlist / Album | Identité compacte, tracklist lisible, actions à proximité | Lecture, recherche si existante, contexte propriétaire et ordre réel |
| Search | État exploratoire et résultats par média, lignes lisibles | Track/Post/Profile/Playlist, Profile Peek, Track Actions, annulation des requêtes |
| Contextes | Famille cohérente de drawers desktop et sheets mobiles, artwork d’origine conservé | Controller, Back/Escape/focus, cache, entité, draft, modération, seek explicite |
| Create | Choix d’intention avant destination ; composition créative au lieu d’un annuaire | Idée/post, morceau, import, clip, variation/remix, IA, Studio et liens existants |
| AI / AI Library | Intention, paramètres, sources et résultats hiérarchisés ; composer mobile dédié | Génération, quotas réels, bibliothèque, écoute, favoris et publication existants |
| Studio | Chrome de workspace, zones Construire/Créations, timeline et inspecteur plus lisibles | Fonctions réelles et coordination des médias ; aucune DAW fictive |
| Upload / Publish | Étapes et métadonnées, droits et progression au premier plan | Fichiers, validation, single/album, autorisations, programmation existantes |
| Post / Clip | Compositions distinctes selon média | Identité Clip, lien explicite au Track source, contrat Post inchangé |
| Community | Personnes, clubs et conversations éditorialisés | Vrais auteurs/posts, catégories et endpoints inchangés, aucune présence inventée |
| Messages / Notifications | Inbox et espace conversation ; activité chronologique et filtres | Requests/contacts/groups/attachments/notes vocales, coordination audio secondaire, cibles et tout-lire |
| Settings / Stats / Boosters / Subscriptions | Formulaires plus calmes, index de compte et information utile | Tous les onglets, blocages, préférences, vrais chiffres, plans et actions existants |
| Auth / Onboarding / Services | Entrée cohérente, formulaires lisibles, navigation de service légère | Login/signup/OAuth/récupération, goûts/intention, support/legal/download et invitations |
| Admin / Legacy | Compatibilité tokens/chrome pour Admin ; destinations historiques explicitement conservées | Aucun outil supprimé ; les démonstrations et sous-produits sont classés dans la matrice |

Le catalogue fictif préexistant de `/studio/library` est explicitement marqué démonstration legacy et relié aux bibliothèques réelles. Les autres destinations historiques ne sont pas présentées comme des nouveautés V2.

## Design system et motion

`app/v2.css` définit les tokens sémantiques et les alias Phase 3 ; les styles music, creation, personal et contexts restent délimités à leur famille.

- Surfaces : `#06080e`, `#10141e`, `#191f2c` ; texte `#eff1f8`, secondaire `#b0b8ca`, légende `#929db4`.
- Accent texte `#b9a3eb`, fond de bouton `#67518f`, bleu `#a9c7ec`, rose `#d7a5c6`. Le bouton ne réutilise pas l’accent clair derrière un texte blanc.
- UI : Inter locale fournie par Next/font, puis system-ui ; display éditorial : Georgia. Titres de workspace sans surcharge de serif. Hiérarchie display/title/section/body/metadata/caption distincte, graisses fortes ramenées à 600.
- Espacements : 4/8/12/16/24/32/48/72 ; rayons 8/14/22/26 ; bordures et ombres limitées, focus visible bleuté, safe areas sémantiques.
- Motion : 120/220/420 ms, arrivée de route courte, ouverture/fermeture des contextes via les primitives existantes, press discret, transformation de la pochette uniquement dans Entry. Pas de full fade noir entre toutes les routes ni de WebGL ajouté aux workspaces.
- Reduced motion : pas de parallax Entry, de translations de chapitre, d’arrivée de route ou de déplacement des toasts ; contenu et commandes restent présents. L’intro garde son contrat temporel et son chemin de repli.
- Le choix de thème conserve ses valeurs stockées `dark/light/system`. Pour respecter une V2 toujours nocturne, les deux niveaux sont nommés **Nuit profonde / Nuit douce** ; le second éclaircit les surfaces, pas une page blanche. Le choix système continue de suivre le système.

Ce n’est pas une affirmation de shared-element géométrique entre toutes les routes : la continuité inter-routes provient surtout du shell, de l’audio global, du fond et des transitions courtes. Les contextes conservent l’origine visible.

## Waveform et lecteur

Les waveforms mini/player/social/workspace partagent la même famille froide et le même langage de progression. Les données restent musicales : la forme synthétique de secours du workspace a été retirée au profit de « Forme d’onde indisponible ». La commande de position reste disponible au clavier lorsqu’un `onSeek` réel existe.

Le mini-player possède un menu Actions natif accessible ; les fonctions précédentes restent présentes. Les cibles imbriquées ont été portées à 44 px. Le décalage sous le dock est appliqué jusqu’au breakpoint desktop, corrigeant un chevauchement tablette. Le CTA Track d’ouverture appelle la commande existante du lecteur étendu.

Un défaut réel du boot étendu a été trouvé : ouvrir la piste courante en pause pouvait la relancer. L’adaptateur `lib/playerOpening.ts` conserve l’état courant lorsque l’identité est la même et évite les setters redondants pour une file équivalente. Il utilise uniquement les commandes existantes ; AudioCore n’est pas modifié. Quand le feed étendu diffère, le comportement existant d’alignement de file est conservé sans play implicite. Ce point est distingué du gate contextes, qui exige zéro mutation audio/file à l’ouverture.

## Responsive et détails vérifiés

Desktop utilise un espace pouvant aller à 1920 px ; tablette a des espacements et dispositions propres ; mobile réorganise les scènes, workspaces et commandes. Les formulaires sont scrollables et les cibles principales font au moins 44 px. Des règles d’écrans courts maintiennent CTA et chapitres Entry dans la fenêtre au lieu d’imposer 720 px de scène sur une fenêtre de 450 px.

Défauts corrigés pendant la revue : double chrome AI Library ; lecteur/dock tablette ; ouverture Track sans effet ; boot relançant une piste en pause ; cibles compactes imbriquées ; petits textes sélectionnés et icônes à contraste insuffisant ; champs Community et surfaces blanches résiduelles ; marque secondaire historique ; erreurs et toasts ; états d’images indisponibles. Aucun de ces correctifs n’ajoute de fonctionnalité métier.

Les ratios calculés et les faux positifs CSS écartés sont détaillés dans l’[addendum personnel/social](synaura-v2-personal-social-implementation.md). Ce calcul ciblé ne vaut pas audit WCAG exhaustif.

## Validation — distinguer les niveaux de preuve

### Sources et contrats

La suite précédente complète est passée à **312/312** dans `artifacts/synaura-v2/tests-pass2.tap`. Des contrôles V2 supplémentaires sont ajoutés pendant la fermeture ; le nombre final sera renseigné après le dernier passage. Les tests de l’ancienne identité raster/landing ont été mis à jour uniquement pour leurs assertions visuelles devenues obsolètes ; assertions audio, consentement, temporisation, routing et sécurité conservées.

TypeScript a passé plusieurs contrôles complets, dont celui suivant le labo élargi. Le gate local `scripts/synaura-v2-local-gate.mjs` vérifie HEAD, index vide, whitespace, secrets ajoutés et absence de diff sur les contrats protégés. Résultat courant : **PASS_SOURCE_ONLY**, 147 fichiers analysés, zéro motif de secret détecté. Ce scan heuristique des ajouts ne constitue pas un audit des secrets historiques de tout le dépôt.

### Revue de composants et captures

`/dev/v2` monte les vrais composants, sans compte codé en dur ni changement de leurs routes serveur. La page renvoie `notFound()` en production. Le runner externe est limité au loopback et fournit des fixtures clairement signalées **FIXTURE QA — LOCAL / NON PERSISTANTE**. Il n’ouvre aucune connexion SQL, n’écrit aucun cookie d’authentification et bloque les mutations avant réseau.

Les premières preuves couvrent Entry et ses six étapes, Auth, Create, AI Library, Clip Create, Publish, Notifications, puis Live/Discover/Track et leurs contextes à 1440 et 390. Les vrais clients AI/Studio/Upload/Library/Messages/Settings ont passé le prévol 390 sur fixtures. Profile Peek, Conversation, Moments, Options, Playlist Picker, Queue, Lyrics, Details et Share fallback ont été parcourus. Les checks instrumentent les appels média et l’identité affichée ; la piste de test est un WAV local synthétique et muet, pas une écoute réelle.

Les passes de navigation Chromium fermées prématurément sont exclues. Le mode faible mémoire des captures suivantes désactive le GPU et force un renderer : il sert uniquement à la présentation, jamais à mesurer les performances de production ni la qualité de l’intro WebGL.

### Blocage des parcours authentifiés réels

La candidate locale n’a pas de `DATABASE_URL` ni de PostgreSQL/test account isolés disponibles. Les gardes SSR redirigent ou refusent donc les routes connectées. Les anciens runners utilisables s’appuyaient sur un tunnel vers la production ; ils n’ont pas été lancés. L’autorisation de créer un PostgreSQL local isolé a été demandée, pas supposée.

Par conséquent, les golden journeys canoniques Live → Track → Back, Discover → Profile → Track, Library → Playlist → Play, Create → AI/Studio → retour et les mutations authentifiées restent **NON VALIDÉS** malgré la couverture de leurs composants. La session fixture navigateur n’est pas une validation de l’authentification réelle.

## Build et performance

À compléter après arrêt coordonné du serveur dev : build production local, confirmation HTTP de l’absence de `/dev/v2`, mesures des bundles et smoke local. Aucun résultat de build/performance n’est déduit d’une capture du serveur dev.

À ce stade : aucun package ajouté, fichiers package/lock inchangés ; WebGL reste limité à la signature existante, widgets contextuels lazy conservés, pas de nouvelle vidéo décorative. Les mesures de temps obtenues sous HMR ou en mode mémoire réduite ne sont pas comparables à la production.

## Réserves et décision

- **Android/Gboard réel : NON TESTÉ.** Le viewport mobile et le focus composer ne prouvent pas la tenue au-dessus du clavier OS.
- **NVDA réel : NON TESTÉ.** Les assertions ARIA/focus ne remplacent pas un lecteur d’écran réel.
- **Zoom navigateur natif 200 % : à rejouer.** Une fenêtre CSS de 720 × 450 contrôle le reflow, pas le zoom natif.
- Authentification, données et golden journeys réels : bloqués par l’environnement DB local manquant.
- Clip SSD réel et mutations de modération : non exercés avec un vrai compte ; aucune donnée utilisateur supprimée.
- Partage OS natif non testé ; seul son fallback existant est couvert.
- Master de marque vectoriel/transparent à fournir ; raster exact utilisé temporairement.
- Cloudinary historiques 401 séparés ; taxonomie Community historique inchangée et dette conservée hors refonte.
- Captures finales, build et mesures restent à consolider ci-dessus.

**Décision courante : candidate locale à continuer de valider, pas de GO déploiement ni de déclaration de readiness complète.** Aucune nouvelle phase, feature Aura ou migration n’est créée par cette refonte.
