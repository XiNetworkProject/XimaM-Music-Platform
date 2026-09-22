# Pochettes animées et nouvelle page morceau

Candidate locale — aucun déploiement ni migration.

## Correctif des pochettes

Trois causes vérifiées :

- Le nouveau Live utilisait une image fixe, sans transmettre la vidéo de pochette.
- Certaines anciennes pochettes ne conservent que l’URL de première image Cloudinary. Après normalisation CDN, le marqueur `f_jpg` disparaît : l’ancienne détection ne retrouvait plus leur MP4.
- Les vidéos décoratives du composant partagé ne portaient pas l’exclusion AudioCore, contrairement aux clips corrigés précédemment.

Le Live et son entrée réutilisent maintenant `TrackCover`. La résolution reconnaît les anciennes premières images et les chemins Synaura migrés du dossier `cover-videos`, sans convertir arbitrairement les images normales en vidéos.

Vérification HTTP sur « Nook's Cranny : Theme Orchestral Remix » : première image migrée 404, MP4 Synaura 200 (`video/mp4`), ancien Cloudinary 401. La vraie vidéo du stockage existant est utilisée, sans nouveau transfert ni réécriture DB. Les MP4 de « Nook's Cranny : Theme Rap Remix » et « Descente de la Lesse » répondent aussi 200. La dette Cloudinary historique n’est pas masquée comme résolue.

Vidéos muettes, inline, en boucle et indépendantes de l’audio musical. Seule la carte active de Live peut animer sa pochette. Le composant partagé suspend les animations hors viewport, onglet masqué, réduction des mouvements, économie de données ou préférence d’ambiance désactivée. Chargement différé des vidéos inactives ; repli image existant en cas d’échec.

## Page `/track/[id]`

- Composition nouvelle : grande pochette, ambiance issue du visuel quand disponible, typographie, artiste/date et métadonnées réelles.
- Écoute, favoris, partage et playlist accessibles au premier plan ; paroles, options et lecteur global conservés.
- Conversation et commentaire à l’instant courant rejoignent les surfaces existantes. Pas de deuxième lecteur ni de petite zone de commentaires imbriquée.
- Actions clip/variation selon les permissions existantes, avis et défi remix, attribution originale, défi associé, publications et informations du morceau conservés.
- Les morceaux IA gardent leurs limitations contractuelles : pas de faux commentaires natifs ou de playlist native.
- Une seule page défilante, commandes tactiles, focus visible, mobile/tablette/desktop et réduction des animations. Navigation partagée inchangée.
- Correctif ciblé : le lien « Ouvrir le lecteur » est désactivé si un autre morceau est courant ; il ne présente plus son lecteur comme celui de la page. Le lien vers les clips pointe sur `/live` et conserve `sourceTrackId`.

## Vérification

- 739 tests PASS, TypeScript PASS, `git diff --check` PASS.
- Nouvelle couverture comportementale du rendu Track : zéro mutation audio au montage, reprise/pause du morceau courant sans remplacement de queue, lecture explicite d’un nouveau morceau, waveform conditionnelle, commentaires/moments/partage/playlist délégués aux contrôleurs existants, branches IA et permissions.
- L’empreinte historique reste vérifiée sur les 414 handlers et 207 appels des autres écrans ; seule la page Track entièrement refondue est remplacée par les tests comportementaux ciblés.
- Navigateur intégré : animation réelle du MP4, pause hors écran puis reprise ; vidéo muette pendant la lecture musicale. Lecture affichée continue jusqu’à 16,76 s, puis pause explicite. Aucun nouvel élément audio propre à la route.
- Conversation et onglet Moments ouverts puis refermés sans publication. Aucun commentaire, favori, playlist ou clip de test créé.
- Contrôle visuel desktop 1440 et mobile 390 ; contrôles de géométrie supplémentaires à 320 et 1024 px, sans débordement horizontal. À 390 px, le bouton Écouter se termine à 668 px, au-dessus du mini-lecteur. Pas de validation sur téléphone physique ni de mesure acoustique externe.
- Compilation optimisée PASS, aperçu relancé avec `next start`. Animation du vrai MP4 revérifiée dans ce build, sélecteur de playlist ouvert puis fermé sans ajout. Les lectures de smoke utilisent les statistiques ordinaires de l’application ; pas d’écriture directe des compteurs.
- Le journal du navigateur conserve un échec de récupération de session pendant l’arrêt volontaire du serveur local pour compiler. Pas de nouvelle erreur applicative observée lors du smoke optimisé ; les anciennes images indisponibles restent une dette média distincte.

Pas de commit ni déploiement. Les autres modifications préexistantes du dépôt sont conservées.

## Addendum — pochettes des posts dans Live

- Cause : `PilotItem` utilisait uniquement `post.image_url`, alors que les partages de morceaux ont généralement une image de post vide et une vraie pochette dans `post.track.cover_url`. Le fond utilisait déjà cette dernière, contrairement au premier plan.
- Correction ciblée : photo propre au post prioritaire, puis pochette du morceau via `TrackCover`, indépendamment de la présence d'une URL audio. Un post texte sans média garde sa présentation texte.
- Les métadonnées vidéo/poster, lorsqu'elles sont fournies, sont conservées par la normalisation. Le même composant retrouve aussi les anciennes pochettes animées à partir de leur URL de première image. L'animation reste muette et limitée à la carte active.
- Aucun endpoint, requête serveur, classement, contrôle audio, like, commentaire ou partage modifié. Les actions restent rattachées à l'identité du post, pas au morceau de sa pochette.
- Tests de non-régression : photo prioritaire, morceau sans URL audio, texte seul, vidéo seule, noms de champs snake/camel, carte inactive et entrée Live ouverte, identité des commentaires/partage. Suite complète : 742 tests PASS ; TypeScript et `git diff --check` PASS.
- Compilation optimisée PASS ; aperçu local relancé avec `next start`. Contrôle du vrai post « Écoute moi ce son signature ! » dans le feed : pochette `voice of creation 8` chargée (image CDN 200, largeur native 1254 px), contrôles visuels desktop 1440×900 et mobile simulé 390×844, sans débordement horizontal. Aucun contenu de test créé ni modification directe des données.
