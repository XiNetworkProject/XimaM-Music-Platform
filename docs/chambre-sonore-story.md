# La Chambre Sonore — récit avant l’écoute

13 septembre 2026 — candidate locale pour revue créative.

## Demande traitée

L’écoute arrivait trop tôt dans la première tranche. La candidate `/dev/chambre` présente maintenant cinq chapitres immersifs avant l’espace d’écoute :

1. **Ressentir** : ouverture « Le son prend corps », matière cobalt approuvée.
2. **Synaura** : présentation explicite de l’espace musical et social.
3. **Explorer** : morceaux, artistes, Live, bibliothèque et playlists.
4. **Créer** : Studio, outils IA et publication de musique existante.
5. **Rencontrer** : profils, commentaires, moments et communauté.
6. **Écouter** : l’espace « Trouvez votre fréquence » déjà apprécié.

Les textes décrivent des possibilités existantes. Aucun faux artiste, compteur, témoignage, contenu utilisateur ou métrique audio ajouté. Le récit n’est pas une visite obligatoire : le bouton Écouter et le lien d’évitement permettent d’accéder directement au sixième chapitre.

## Navigation et présentation

- Défilement natif avec points d’arrêt plein écran, boutons précédent/suivant et repères des six chapitres. Aucune interception de wheel/touch ni neutralisation du clavier.
- Le dernier chapitre autorise le défilement libre de son contenu. Les petites fenêtres peuvent laisser les scènes grandir plutôt que couper du texte ; la navigation utilise leurs offsets réels, recalculés au redimensionnement.
- Une seule matière cobalt, six cadrages interpolés : entrée, expansion centrale, déplacement latéral, gros plan diagonal, scène de rencontre, arrière-plan discret de l’écoute.
- Même texture et mêmes shaders/couleurs. Aucun nouveau média musical, moteur audio, analyseur ou provider.
- Pause des mouvements et reduced-motion conservés ; en mouvement réduit, chaque chapitre conserve son cadrage statique.
- Le focus accompagne une navigation explicite vers la section choisie. Compteur et annonce accessible de chapitre ; sections nommées, vrais boutons et focus-visible.
- Le catalogue est activé à l’arrivée dans l’écoute ou sur accès direct. Le composant reste monté lors des retours dans le récit : sélection, filtre et cache ne sont pas réinitialisés par la navigation.

## Vérifications de cette révision

- **138/138 tests PASS** : 14 Story, 18 produit, 14 prototype et 92 régressions AudioCore/contextes/Profile/Comments/Actions.
- **Type-check complet PASS**, rejoué après les derniers changements.
- Compilation et rendu de la route via le serveur dev : PASS.
- Le build production complet de la tranche précédente avait passé ; **il n’a pas été rejoué pour cette révision narrative**. La garde production existante reste inchangée et couverte par les tests source. Aucun résultat de performance production n’est déduit du serveur dev.
- Parcours isolé desktop : 0 → 900 → 1800 → 2700 → 3600 → 4500 px à 1440 × 900, chapitre et cadrage correspondants à chaque arrêt. Aucun débordement horizontal.
- Avant le sixième chapitre : aucune carte catalogue chargée dans le parcours frais observé. Au sixième : 18 morceaux du cache réel local, aucun transport musical lancé automatiquement.
- PageDown natif depuis l’entrée atteint le chapitre Synaura à 900 px. Dans l’écoute mobile, le défilement progresse au-delà de son début tout en restant sur le chapitre 6.
- Les six scènes sont revues à 390 × 844. Aucun débordement horizontal après correction. Contrôle supplémentaire Créer à 360 × 740 : contenu et commandes accessibles, aucun débordement.
- Retour à l’entrée et accès direct à l’écoute testés. Aucune logique de lecture modifiée ; invariants audio couverts par les tests. Cette passe n’ajoute pas un nouveau smoke audio authentifié ou de mutations serveur.
- Captures finales : `artifacts/chambre-story/desktop-01-ressentir-1440.png` à `desktop-06-ecouter-1440.png`, et les six équivalents `mobile-…-390.png`.
- Certaines captures finales utilisent la pause du décor pour stabiliser la composition ; elles ne mesurent ni FPS ni fluidité à 60 Hz.
- Android réel, clavier OS et lecteur d’écran réel : non testés dans cette passe.

## Défauts observés et corrigés pendant la revue

1. Les styles génériques des titres du récit affectaient aussi le titre du sixième chapitre : exclusion explicite de la section d’écoute et faible spécificité pour préserver les variantes du récit.
2. L’animation du transport vide pouvait annuler son masquage par opacité : le transport vide est réellement masqué hors écoute. Un morceau déjà chargé conserve ses commandes.
3. Les anneaux décoratifs du chapitre Créer dépassaient horizontalement sur mobile (491 px pour un conteneur de 380 px) : débordement décoratif confiné aux scènes, sans masquer du texte essentiel. Largeur finale 380/380 px.

## Limites et conservation

La limite de données de la première tranche reste inchangée : catalogue réel conservé dans le cache Next local, PostgreSQL local non configuré dans l’environnement disponible, certaines fiches/profils/commentaires renvoyant « introuvable ». Aucun branchement de production, tunnel, modification DB, endpoint ou contrat métier pour contourner ce manque.

Fichiers de cette révision : `ChamberProduct.tsx`, `ChamberMaterial.tsx`, nouveaux `chamberStory.ts`, `chamber-story.css`, `tests/chamber-story.test.mjs`, documentation. `ChamberListening.tsx` et les hooks AudioCore/contextes ne sont pas modifiés par cette révision.

Le prototype `prototypes/chambre-sonore/` et sa texture ont les quatre mêmes empreintes que la référence approuvée. Le scan heuristique des cinq fichiers Story code/tests ne trouve aucun secret ni espace final. Index Git vide, HEAD inchangé ; modifications antérieures utilisateur/V2/natives préservées.

**Aucun commit, push, déploiement, migration ou nouvelle phase. La nouvelle narration attend sa revue visuelle.**
