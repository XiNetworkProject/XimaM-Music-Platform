# Chambre signature — recherche, profils et collections

Candidate locale de présentation. Ce document ne clôture pas la refonte entière et ne présume pas d’une validation créative utilisateur.

## Sources et sauvegardes

Modifications dans les quatre pages effectives :

- `app/search/page.tsx` ;
- `app/profile/[username]/page.tsx` ;
- `app/playlists/[id]/page.tsx` ;
- `app/album/[id]/page.tsx` ;
- nouvelle couche **CHAMBRE SIGNATURE MUSIC** de `components/v2/music-v2.css`.

Copies exactes avant intervention : `artifacts/chambre-signature/before/music/`, chemins relatifs conservés. Les anciennes sauvegardes sont intactes. Aucun fichier d’environnement, clé ou dump n’a été copié.

L’entrée approuvée, le prototype, Track, Live, Discovery, les players, les API et AudioCore ne sont pas modifiés par ce lot. Le seul ajout à la limite de l’ancienne couche Discovery est son commentaire de fin explicite, sans changement de déclaration CSS.

## Compositions implémentées

### Recherche : instrument de repérage

Le formulaire conserve son action réelle et devient la commande centrale : contraste cobalt, ligne de métal, focus lisible, flèche tactile. Un diaphragme graphique décoratif, construit en CSS et `aria-hidden`, donne une signature au titre ; il ne simule ni analyse audio ni résultat de recherche.

L’état initial distingue tendances réelles, artistes réels et historique local. La première tendance est une entrée visuelle plus généreuse, les artistes sont des portraits et les recherches récentes gardent leurs commandes de suppression.

À la demande de la revue navigateur, trois liens littéraux sont ajoutés **dans le bloc initial `!query` existant** : `/discover`, `/radar`, `/community`. Ce sont des destinations existantes, pas de fausses suggestions. Ils utilisent `Link` pour la navigation interne et `prefetch={false}` ; aucun effet, query, tri ou compteur supplémentaire.

Les résultats différencient les lignes musicales, les extraits de posts, les profils et les playlists. Les filtres, l’annulation réseau, les routes, Profile Peek et Track Actions restent inchangés. La CSS musique étant déjà importée par le layout global, aucun import redondant n’est conservé dans Search.

### Profil : portrait, écoute puis discographie

L’identité et l’invitation à écouter forment deux plans distincts sur grand écran : portrait/bannière et données du profil d’un côté, vrai morceau spotlight de l’autre. En mobile, identité compacte puis métadonnées et biographie pleine largeur ; le spotlight redevient un bloc compact avec ses trois actions existantes.

Les morceaux de « Signature musicale » sont de vrais disques visibles, pas de petites vignettes de tableau de bord. La discographie garde son ordre, ses commandes et ses détails ; les cinq sections Sons, Clips, Variations, Playlists et Posts restent présentes. Les actions propriétaire, visiteur, messagerie, follow, modifications d’images, modération des variations et boosters sont conservées.

Le libellé d’identité distingue réellement un profil artiste d’un profil non artiste. `aria-pressed` expose l’onglet actif sans changer sa commande.

### Playlist : pochette sur table d’écoute

La couverture réelle est insérée visuellement dans une pochette chrome décorative. Le titre et les trois commandes originales sont disposés en regard sur grand écran, et en composition compacte sur mobile. Le fil des titres a son propre en-tête avec le nombre réel visible/total, puis les outils existants de recherche, genre et tri.

Toutes les commandes des lignes — lecture, likes, commentaires autorisés, file, partage et téléchargement autorisé — restent présentes. Le panneau À propos/Actions/Détails est conservé. Aucun ordre, permission de collection ou contrat playlist/album n’a été modifié.

### Album : objet et livret

La pochette réelle est accompagnée d’un disque décoratif noir/chrome, sans lecture, rotation infinie ou moteur ajouté. En face, le livret conserve une ligne numérotée par piste et l’ordre musical de l’album. Les actions Lecture/Pause, aléatoire, ajout à la file et partage sont strictement les mêmes. La décoration est non interactive et cachée aux technologies d’assistance.

Les états de chargement et d’indisponibilité des collections rejoignent le même cadre noir/cobalt sans masquer le message d’erreur ni fabriquer de contenu.

## Invariants et tests exécutés

**35 tests ciblés PASS, 0 échec**, comprenant les 6 nouveaux tests de `tests/chambre-signature-music.test.mjs`, plus les tests musique précédents, Discovery et loader StrictMode. `git diff --check` ciblé PASS ; seulement les avertissements LF/CRLF habituels.

Le nouveau contrôle AST conserve exactement, depuis les copies avant intervention :

- les quatre programmes non JSX, imports et logique compris ;
- **154 handlers existants** ;
- **160 appels protégés** (hooks, réseau, lecture/file, upload et état follow).

Aucune exemption dans ces nouveaux invariants. L’audit musical précédent des **420 handlers / 212 appels** reste PASS, avec sa seule exception de loader déjà documentée, inchangée par ce lot.

Deux tests exécutent les **vrais composants Album et Playlist transpiliés** avec un environnement React isolé de test. Ils vérifient les identités et l’ordre rendus, l’absence de lecture à l’ouverture, le filtre/tri existant de playlist et l’index transmis par le vrai handler lors d’une lecture explicite. Les objets de test sont seulement des fixtures unitaires non persistées, jamais une donnée affichée dans le produit ou une preuve de parcours connecté.

Le test Search vérifie par AST ses trois liens exacts, `prefetch=false`, l’absence de nouveaux handlers et leur position sous `!query`. Les sections et états Profile sont contrôlés en source. PostCSS vérifie l’additivité et l’isolation complète de la nouvelle couche, ses dispositions mobile/tablette, focus et reduced motion ; aucune nouvelle déclaration `display:none` ne cache contenu ou commande.

Les anciennes baselines n’ont pas été remplacées :

- le test Discovery est simplement borné à son commentaire de fin, afin de ne pas attribuer les nouvelles règles d’autres écrans à cette couche ; ses hashes et assertions sont conservés ;
- l’agent principal coordonne l’exception exacte des trois seuls attributs `prefetch={false}` dans l’ancien audit personnel de Search, sans exclusion d’un handler ou d’un effet.

## QA réelle et limites

La revue navigateur est centralisée par l’agent principal. Il a signalé une recherche mobile sans overflow avant l’ajout final des trois raccourcis ; cela n’équivaut pas à une validation visuelle complète de tous les états de ce lot.

Les pages Profile, Playlist et Album obtiennent leurs données via leurs hooks/routes existants, pas via des props de maquette. Sans base ou compte local autorisé, aucun faux parcours peuplé ni validation de mutation n’est revendiqué. Les états conditionnels longs, les profils propriétaires/visiteurs, les identités réelles, la modération, les likes et les parcours de lecture complets restent à revoir sur données autorisées. Les tests unitaires ne remplacent pas ces validations.

Aucun navigateur, serveur, build global, type-check global, commit, staging, push, déploiement ou changement d’infrastructure lancé par ce sous-lot.
