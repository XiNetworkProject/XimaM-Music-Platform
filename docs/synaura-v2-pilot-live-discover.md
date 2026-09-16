# Synaura V2 — pilote Live, navigation et Discover

## Périmètre et revue

Le pilote est parallèle : `/v2/live` et `/v2/discover`, avec `/v2` redirigé vers Live.
Une session authentifiée est obligatoire. Les pages portent `noindex,nofollow` et
ne sont ajoutées ni au sitemap ni à la navigation publique. La revue depuis la
home utilise les URL directes : aucun parcours normal n'est remplacé.

- https://synaura.fr/v2/live
- https://synaura.fr/v2/discover

Baseline précédant le pilote : `a0f554f90eb6ee412de931dbc673c9db1fdd9cb4`.
Les changements natifs et documents de phases antérieures présents dans le
worktree ne font pas partie de ce pilote. Aucun contrat DB, endpoint, modèle
d'abonnement ou AudioCore n'est modifié.

## Vision et identité

L'accueil public réel a été revu dans le navigateur : noir bleuté, lumière
froide, typographie ample et matière musicale. L'app devient sa suite calme,
éditoriale et humaine, sans grille de panneaux lumineux ni décor cosmique.
Le S encerclé et le wordmark proviennent du raster original déjà conservé dans
`lib/brandV2.ts` ; ils ne sont pas redessinés.

Live desktop oppose une grande image à une composition typographique ouverte.
L'artwork éclaire très légèrement son environnement. Le titre, l'auteur, le
signal audio et les actions partagent la scène plutôt que des cartes séparées.
Sur mobile, le média précède les informations et commandes, sans rail sur le
texte. Le seul défilement est celui du feed ; les écrans courts et le zoom
peuvent faire défiler la scène entière, jamais une boîte de métadonnées imbriquée.

## Frontières techniques

`components/pilot/` contient de nouveaux renderers et styles entièrement scopés.
`SynauraScroll` expose un adaptateur de présentation optionnel `renderPilot` :
feed, pagination, classement, snapshots, requêtes, permissions et controllers
restent ceux de V1. Sans cet argument, la présentation et le comportement V1
restent identiques. Un test projette les ajouts exacts puis compare le hash
complet de la source V1 à la baseline, sans réécrire les fixtures historiques.

Les deux autres points d'intégration sont les prédicats de chrome exacts et
l'absence de la bulle de queue V1 sur ces seules routes. Aucun nouveau provider
audio ou contextuel, aucune dépendance, aucun élément musical `<audio>` ajouté.

## Live et types de contenu

- Track : artwork, titre, auteur, lectures, signal réel, favoris, suivi,
  commentaires/moments, réactions, partage, queue et Options.
- Post : composition citation, auteur, média facultatif, favori et commentaires
  Post, accès au post complet ; pas de fausses capacités replies/likes de replies.
- Clip : vraie vidéo muette, identité et commentaires Clip distincts du morceau
  source. Le lien partagé cible le clip dans Live, pas seulement la Track source.
  Les actions musicales restent explicitement celles du morceau source.
- Creator spotlight : portrait vertical, biographie et entrée Profile Peek.
- Collection : sélection réelle, écoute par la logique existante et page complète.
- Challenge/annonce : contenu et destination réels lorsqu'injectés par le feed.

Les filtres Pour vous, Nouveautés, Clips, Créateurs et Défis conservent leurs
sources. Les corps d'items sont limités au voisinage actif ; les autres sont
inertes. Les favoris ne résolvent leur état que sur l'item actif, le compteur de
commentaires lit le cache sans requête, les signaux sociaux suivent la Track active.
Les mutations sociales ne sont déclenchées que par une action utilisateur.
La validation automatique ne crée ni like, ni suivi, ni commentaire, ni réaction.

## Navigation, player et continuité

Rail desktop discret, bottom navigation mobile à cinq destinations : Live,
Découvrir, Créer, Bibliothèque, Communauté. Search, Messages, Notifications et
Compte donnent accès aux routes existantes. Les liens ne préchargent pas leurs
destinations. Le player compact de Discover contrôle exclusivement AudioCore ;
Live garde ses commandes de scène sans deuxième player.

Les transitions entre les deux routes portent le snapshot Live existant, sans
le copier ni réécrire l'historique. Les retours depuis Track V1 restent les Back
natifs. Le pilote supprime l'autoplay à sa première entrée/restauration ; le
scroll explicite conserve le contrat musical Live existant, notamment le point
de départ du morceau associé à un clip.

## Signal et surfaces contextuelles

La waveform dessine les vrais peaks comme un signal fin, avec progression,
durée, moments horodatés et clusters de réactions. Pas de peaks inventés ni
d'analyse audio supplémentaire. La progression est mise à jour sans rerender
React par frame ; l'animation est annulée au démontage. Seuls les gestes sur la
range ou les marqueurs déclenchent un seek dans ce composant.

Profile Peek, Comments, Moments, Options, Playlist Picker, Queue, Lyrics,
Details et Share réutilisent les controllers existants. Seules quelques couleurs
de leurs portails sont scopées à la présence du pilote. Focus, Back, cache,
drafts et permissions restent ceux des surfaces validées.

## Discover

Composition éditoriale reconstruite : grande première écoute, rencontre avec
un artiste, index de huit ambiances, Radar asymétrique, collections publiées,
nouveautés décalées et communautés/City. Ce n'est pas une suite de rows identiques.
Sur mobile, un sujet domine à la fois et la page défile naturellement.

Sources normales : `/api/discover` (trending et newest), `/api/discover/radar`,
`/api/editorial-collections/featured`, puis `/api/discover/moods` uniquement
après choix explicite. Cache par compte/URL de cinq minutes, annulation via
AbortSignal, pas de revalidation au focus. Erreurs et absences de résultats ne
sont pas remplacées par de faux contenus. Les médias suivent le résolveur public
et le fallback déjà utilisés dans Synaura.

## Motion et accessibilité

Entrée de métadonnées de 280 ms sur desktop, hover discret, aucune animation
infinie ni WebGL. `prefers-reduced-motion` supprime transitions et animations.
Range clavier, focus-visible, raccourcis Live respectant les contrôles interactifs,
skip link, items inactifs inertes, réserves safe-area et zones tactiles de 44 px.
NVDA réel et clavier Android/Gboard réel ne sont pas présentés comme testés.

## Validation et mesures

Gates du pilote initial : 668 tests PASS, TypeScript PASS et `git diff --check`
PASS. Le scan des 25 fichiers sélectionnés ne trouve aucune valeur sensible de
l'environnement local ni signature de clé privée. Aucun fichier d'environnement,
artifact, cache ou changement natif n'est inclus dans le commit.

Compilation production finale PASS : Live V2 6,25 ko / 414 ko au premier chargement,
Discover V2 10,1 ko / 364 ko ; socle partagé 307 ko. Comparaison V1 : Live 408 ko,
Discover 390 ko au premier chargement. Ce sont les estimations Next, pas les
octets réseau non compressés. Les derniers ajustements médias, cibles tactiles et
favori Clip sont inclus. Smoke HTTP local compilé PASS : V2 authentifiée,
redirection des invités, noindex/nofollow, V1 en 200, API Discover/Clips/collections
en 200, absence de V2 du sitemap. Next peut transmettre la redirection auth dans
le flux RSC d'une réponse 200 ; son instruction `NEXT_REDIRECT` est vérifiée.

Revue locale effectuée sur Live à 390×844 et grand desktop : commandes lisibles,
Comments/Moments, Profile Peek, Options et Playlist Picker ouverts sans mutation
sociale. Live vers Discover conserve la même instance AudioCore, le même morceau,
la même queue, 14 listeners AudioCore et un seul élément musical ; aucun player
secondaire. Discover charge les vrais contenus et médias après passage par le
résolveur public. Les mesures dev (environ 540–600 nœuds DOM et 75–84 Mo de heap)
ne sont pas une mesure de performance production ni une preuve d'absence de fuite.

Matrice locale compilée Live et Discover revue à 360×800, 390×844, 430×933
(arrondi d'un pixel du navigateur), 768×1024, 1440×900 et 1920×1080 : pas de
débordement horizontal, commandes Live accessibles, player mobile au-dessus de
la navigation. Cinq allers-retours chauds Live/Discover conservent le morceau,
la queue, les 14 listeners et un élément musical. Les requêtes Discover restent
à deux et Radar à une sur ces cycles. Heap observé entre 21,46 et 34,90 Mo :
variation mesurée sans GC forcé, pas une preuve d'absence de fuite. Retour Track
vers Live : même ancre et génération AudioCore.

Réserves de revue à distinguer d'un PASS : zoom 200 % et lecteur d'écran réel. Pas de validation
Android/Gboard réel. Les clics de like/follow/réaction ne sont pas exécutés pour
ne pas créer de faux signal social. Un clip absent des données n'est pas remplacé
par un faux média. Les preuves HTTP, captures et contrôles de bascule sont
conservés dans `artifacts/v2-pilot/`, sans identifiant de session ni secret.

La publication reste une **preview authentifiée pour revue**, pas une validation
créative générale ou un remplacement de V1. Les contrôles après bascule sont
consignés dans le rapport opérateur `artifacts/v2-pilot/deployment.md`.

## Déploiement et retour arrière

### Accueil Live enrichi — candidate locale du 16 septembre 2026

La publication est suspendue pour revue de l'accueil. La production demeure sur
`a0f554f90eb6ee412de931dbc673c9db1fdd9cb4` ; le timer de déploiement est
temporairement arrêté pour empêcher la publication de la première candidate
`373bef7656f9f2b3ea72c27c486ab48932918d56` déjà poussée. Il doit être réactivé
à la reprise explicite de la publication, après push de la candidate finale.

L'entrée expose l'item actif exact du feed : aucune sélection indépendante.
Les statistiques, accès fiche/commentaires/partage via la fiche, trois autres
morceaux, deux publications et raccourcis Découvrir/Radar/Studio IA/Événements
réutilisent les données et la navigation existantes, sans nouvelle requête.
Un seul conteneur défile ; pas de carrousel ni de zone interne scrollable.
Le bouton direct révèle le même item. Au bas de l'accueil, un nouveau geste
ouvre le fil ; l'inertie du geste qui atteint le bas ne doit pas le fermer.

Revue navigateur à 1440×900 et 390×844 : contenu réel, pas de débordement
horizontal, publications et bouton final lisibles. Scroll desktop vers le bas :
accueil conservé, puis second geste : même ancre dans le fil. Lecture mobile
vers le fil : même morceau, queue et génération (2), lecture continue de
11,31 à 22,47 s. Preuves dans `artifacts/v2-pilot/entry-rich-*`.
669 tests PASS, TypeScript PASS, diff check PASS, scan de 26 fichiers sans
secret détecté. Build production de l'accueil enrichi PASS le 16 septembre :
Live V2 8,23 ko / 416 ko au premier chargement (estimation Next).
Téléphone tactile physique et lecteur d'écran non testés.

Workflow canonique Freebox : commit isolé sur `migration/freebox-storage`, push,
build d'une nouvelle release, preflight, bascule atomique, health puis rétention.
Le SHA servi doit correspondre à `current` et `last-successful-sha`.

Pour retirer seulement le pilote, retirer ses routes/components et ses ajouts
optionnels de chrome/adaptateur dans un correctif ciblé, puis déployer normalement.
Il n'est pas nécessaire de modifier les données ou l'AudioCore. Les changements
utilisateur hors périmètre ne doivent jamais être inclus dans ce retrait.
Le rollback atomique de la release précédente reste le recours opérationnel si
le service entier est affecté, pas la stratégie normale de retrait V2.
