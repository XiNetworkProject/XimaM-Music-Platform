# Navigation et clips — candidate locale du 21 septembre 2026

## Périmètre

- Navigation produit commune : rail desktop ouvert, rail compact tablette, barre basse mobile à quatre entrées sans cadre (Live, Découvrir, Créer, Menu). Le menu conserve l’accès à Bibliothèque, Communauté, aux services et au compte. Aucun bandeau supérieur réintroduit dans Live.
- Micro-interactions CSS, focus clavier et réduction des animations système ; aucune nouvelle requête dans la navigation.
- Fond de pochette, analyse audio, particules et filtres Live validés précédemment conservés.
- Aucun commit, push, déploiement ou changement de production. Les modifications natives et les autres travaux locaux sont conservés.

## Continuité de lecture

- Le contrôleur Live observe la fin du morceau visible et suit l’index réellement choisi par le lecteur, uniquement si la file est encore celle du feed. Les cartes non musicales sont prises en compte dans la correspondance des indices.
- Une navigation utilisateur invalide la transition automatique en attente ; une surface contextuelle ouverte diffère le déplacement du feed. Ce déplacement ne déclenche pas une seconde lecture.
- Correction ciblée AudioCore : une même musique présente plusieurs fois dans la file ne doit pas être ramenée systématiquement à sa première occurrence. Test de régression sur une file `A → B → A (clip) → C`.
- Les clips du renderer Live ne disposent plus d’un autoplay vidéo indépendant. Leur image muette suit la lecture, la pause, le seek et la vitesse du morceau associé. Un seul lecteur musical reste audible.
- La fin d’un clip passe à la carte suivante, ou met en pause au dernier clip. Le point de départ est également recalé à zéro pour un clip sans offset ; quitter/revenir à un clip réarme son recalage.
- Les vidéos gardent leur composition avec `object-fit: contain`, sans rotation de pochette : plein cadre avec commandes superposées sur mobile, lecteur adapté portrait/paysage/carré sur grand écran.
- Les clips réels apparaissent plus tôt dans Pour vous, sans doublonner leur identité ni modifier le premier morceau. Un feed contenant seulement des clips n’est plus forcé à vide.

## Publication et suivi

- Formulaire vidéo-first : fichier ou glisser-déposer, aperçu sans recadrage, son autorisé, légende, tags et publication. Protection contre une ancienne lecture de métadonnées qui écraserait un fichier choisi plus récemment ; délai maximal de lecture des métadonnées.
- Après mise en file réussie, retour au contexte précédent, `/live` en repli. Un second envoi ne peut pas écraser un transfert ou un échec en attente.
- Badge monté une seule fois dans le layout global : préparation, transfert réel XHR, vérification côté serveur, publication, succès/échec. Le pourcentage représente uniquement les octets transférés, pas un faux pourcentage global de publication.
- Succès : notification puis retrait automatique du badge. Échec : notification, réessai et fermeture explicites. Un réessai de publication réutilise le brouillon et le fichier déjà transféré.
- Navigation interne autorisée pendant l’envoi ; avertissement avant fermeture/rechargement de l’onglet. **Ce n’est pas un transfert résilient à la fermeture du navigateur.**
- Les fichiers conservés après échec peuvent être orphelins si le suivi est abandonné ; aucun nettoyage destructif automatique ajouté.

## Quatre minutes : contrat et déploiement à prévoir

Limites partagées : **15 à 240 secondes, 250 Mio**. Le minimum historique de 15 secondes est conservé. Vérification côté navigateur et ffprobe côté stockage, puis nouvelle inspection du fichier détenu par l’auteur lors de la publication. Les métadonnées déclarées par le client ne suffisent pas.

La migration `database/migrations/20260921120000_music_clips_four_minutes.sql` élargit uniquement `music_clips_duration_check`. Le runner canonique détient la transaction ; acquisition de verrou bornée à 5 secondes. La validation parcourt la table sous le verrou de la transaction : à programmer lors de la publication, pas pendant cette revue locale. Aucune réécriture de données ni modification des permissions. La configuration Nginx versionnée autorise déjà 500 Mio ; sa configuration effective devra être confirmée au déploiement.

La migration est **préparée mais NON APPLIQUÉE**. Ne pas annoncer l’upload 4 minutes disponible en production avant migration + smoke SSD authentifié. Le serveur de prévisualisation lit les vraies données : aucun test de publication n’a donc été lancé contre cette base.

Validation après migration : lire `pg_get_constraintdef` et `convalidated` pour `music_clips_duration_check`, tester les bornes 15/240/241 dans une base isolée, puis un transfert autorisé de 4 minutes sur SSD. Pour un rollback à 60 secondes, vérifier d’abord qu’aucune ligne ne dépasse 60 ; ne jamais supprimer ni raccourcir un clip utilisateur pour permettre le rollback.

Le contrat audio reste celui des clips existants : **morceau Synaura associé**. La variante « son original de la vidéo ou morceau au choix » a été proposée à l’utilisateur, sans réponse à ce stade. Aucun faux morceau source ou changement implicite du contrat de crédit/permissions n’a été introduit.

## Validation

- 732 tests PASS, dont nouveaux cas de fin de piste, occurrence répétée, clips dans le feed, bornes de durée, suivi réel, concurrence, échec/réessai, publication authentifiée/autorisée (mocks isolés), absence de publication fictive et navigation sans bordure décorative.
- TypeScript PASS.
- Comparaisons historiques conservées via projections exactes des changements fonctionnels ciblés ; le formulaire et le badge, volontairement refondus, ont leur nouvelle couverture dédiée.
- Contrôles visuels navigateur intégré aux tailles CSS proches de 1440×900, 1024×768 et 390×844 : navigation, menu Espaces, atelier clip, vidéo réelle, transition de clip. Aucun nouveau message d’erreur console observé lors du contrôle final de l’atelier.
- Fin de piste vérifiée via le curseur du vrai lecteur : `Trials of life` (carte 06) → `Les contrôleurs` (carte 07), carte et lecture suivantes actives sans swipe manuel. Le journal conserve un ancien échec de synchronisation des écoutes pendant l’arrêt/reconstruction du serveur local ; pas d’erreur supplémentaire observée lors de ce parcours.
- Défaut observé au rechargement : le scroller pouvait être recréé après restauration du morceau actif, laissant une carte virtualisée vide à l’écran. Alignement sur la carte restaurée uniquement au montage du scroller ; le test vérifie aussi qu’un swipe ultérieur n’est pas interrompu. Rechargement revérifié dans le build optimisé final : carte 07 « Les contrôleurs » visible, identité conservée, scroller à 4920 px et carte à y=0.
- Corrections issues de cette revue : contraintes anciennes qui positionnaient la vidéo derrière les commandes ; annulation normale de `video.play()` qui affichait à tort une erreur ; bouton Espaces desktop trop étroit.
- Pas de test Android/iOS physique ; pas de validation auditive sur un appareil externe ; pas de nouveau transfert SSD. Le navigateur confirme la progression de la vidéo réelle et l’état de lecture du morceau associé, pas une mesure acoustique.
- Le comportement shuffle avec plusieurs occurrences identiques n’est pas certifié par le nouveau test (qui porte sur l’ordre normal du feed).
- Build optimisé PASS, puis aperçu local via `next start` sur 127.0.0.1:3000 (aucun déploiement). TypeScript PASS dans ce build également. `git diff --check` PASS, aucun fichier staged ; scan ciblé des ajouts : aucun motif de secret détecté.

## Correctif après retour utilisateur : lecture/pause des clips et taille PC

- Cause identifiée : `LiveClipVideo` ne portait pas la politique d’exclusion des médias secondaires. Son événement `play` était donc capturé par AudioCore, qui mettait le morceau source en pause. La vidéo suivait cette pause, libérait la priorité secondaire et relançait le morceau : boucle de lecture/pause.
- Correction locale au composant : vidéo toujours muette, synchronisée au morceau, avec `data-synaura-audio-policy="independent"` (politique existante). Aucun changement au moteur audio ni à la coordination des vrais aperçus ou messages vocaux.
- Nouveau test de régression exerçant le listener document d’AudioCore : vingt lectures vidéo ne coupent ni ne relancent le morceau. Un aperçu ordinaire prend encore la priorité puis restitue la lecture normalement.
- Desktop : scène vidéo sur toute la hauteur utile, informations et actions dans une colonne latérale compacte, proportions natives conservées sans recadrage. À 1440×900, scène de 760 px de haut contre 522 px maximum auparavant ; le portrait exploite cette hauteur. Le layout des morceaux reste inchangé.
- Navigateur : clip « Chaud Chaud Chaud » en lecture continue ; pause maintenue à 24,926 s lors de contrôles successifs ; passage au clip « Corsa au Periph », progression de 13,037 à 28,213 s, trois autres vidéos en pause. Contrôles desktop 1440×900 et mobile 390×844 ; aucun nouveau message d’erreur console observé. Pas de téléphone physique ni de mesure acoustique.

## Révision visuelle : navigation ouverte, sans bordures

- Retrait des cadres flottants, contours, séparateurs et cases de sélection de la navigation partagée. Rail desktop intégré au fond ; tablette avec symbole issu du même logo ; barre mobile bord à bord avec safe-area.
- État actif par couleur, halo doux et petit point ; micro-interactions au survol et à la pression, désactivées en reduced motion. Focus clavier conservé via `:focus-visible`, pas de contour décoratif permanent.
- Logo et destinations inchangés. Phrase décorative du header retirée. Menus Compte/Espaces sans contours, mêmes accès et mêmes actions ; aucune nouvelle requête.
- Vérification navigateur 1440×900, environ 1024×768, 390×844 : largeur des bordures calculée à 0 px pour les barres, liens principaux et menu Espaces. Mobile sans débordement horizontal. Tab/Shift+Tab testés : focus visible 2 px sur le contrôle, fermeture du menu par Escape.
- Erreur de chunks du serveur dev pendant le changement de mode de prévisualisation, disparue après rechargement complet ; pas de correctif applicatif ajouté pour cet incident de prévisualisation.
- Aucun changement dans le feed, les clips, l’upload, AudioCore, les routes, l’accueil ou les données pendant cette passe.

## Allègement mobile : quatre accès

- Sur mobile uniquement : Live, Découvrir, Créer et Menu. Bibliothèque et Communauté restent dans le répertoire existant ; les accès desktop/tablette sont inchangés. Libellés à 11 px, aucune nouvelle bordure ni requête.
- Vérification navigateur à 390×844 et 320 px de large : quatre contrôles visibles, aucun débordement horizontal. À 390 px, chaque accès dispose d’au moins 92,5×60 px. Menu s’ouvre, expose les destinations secondaires et restitue le focus au bouton à la fermeture par Escape. Les cinq destinations principales restent visibles à 1440 px.
- 733 tests PASS ; TypeScript PASS ; `git diff --check` PASS. Pas de nouveau build production pour cet ajustement ciblé ; aperçu local dev actualisé. Aucun commit ni déploiement.
