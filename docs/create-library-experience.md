# Créer et Bibliothèque — seconde candidate locale et navigation commune

> Historique de la candidate, non validée créativement. La page Créer et son résonateur
> ont été remplacés à la demande de l'utilisateur par un tiroir contextuel depuis le bas.
> Voir `create-sheet-experience.md` pour l'état courant. Les résultats ci-dessous
> concernent les anciennes passes, pas une validation du nouveau tiroir.

## Périmètre

- `/create` : point de départ en quatre intentions (IA, audio, Clip, collaboration), action principale lisible, accès au Studio unifié, composition adaptative et transitions légères.
- `/library` : discothèque personnelle, reprise de l'écoute, recherche, collections, présentation des playlists en pochettes, liste de morceaux et états vides.
- Nouvelle passe demandée après rejet de la première : navigation commune persistante (identité, Live, Découvrir, Créer, Bibliothèque, Communauté), en-têtes locaux masqués par leur propriétaire. Le Studio conserve ses commandes de travail, sous la même navigation produit.
- Atelier : résonateur décoratif animé selon l'intention, lumière réactive au pointeur, transitions des cartes et des actions. Bibliothèque : pochettes et disques en profondeur, reprise d'écoute, éclairage et états vides animés.
- Les animations suivent le contrôle Ambiance existant, le mouvement réduit, l'économie de données et la visibilité du document. Aucun nouveau moteur audio.
- Permissions, données, mutations et AudioCore conservés. Les corps des contrôleurs Créer/Bibliothèque hors JSX sont identiques à la baseline `e6222df8`. La navigation réutilise les liens de continuité existants et les contrôles Messages, Notifications, Compte et Espaces.
- Pas de migration, nouvelle API, commit, push ou déploiement. Modifications natives et documents historiques préexistants laissés intacts.

## Vérifications

- Suite complète première passe : **686/686 PASS**. Seconde passe : **689/689 PASS** ; projection exacte des seuls ajouts de présentation dans les anciens tests de non-régression, sans modifier leurs empreintes historiques.
- TypeScript : **PASS**.
- Build production local : **PASS**, première et seconde passes.
- `git diff --check` : **PASS**.
- Recherche ciblée de clés privées, jetons et URL PostgreSQL contenant des identifiants dans les seize fichiers applicatifs concernés : aucune détection. Aucun environnement ajouté.
- Navigateur desktop : quatre intentions de création et destinations réelles contrôlées ; Bibliothèque avec données réelles, recherche et tri contrôlés.
- Bibliothèque à 390 × 844 CSS : pas de débordement horizontal ; recherche, tri et ouverture du formulaire de playlist vérifiés. Formulaire non soumis par les tests.
- Créer à 390 × 844, 320 et 1440 × 900 CSS : pas de débordement horizontal ; sélection Clip et destination `/clips/new` confirmées. Capture mobile enregistrée ; aperçu local redémarré après compilation.
- Aucune génération payante ni modification volontaire de contenu pendant ces contrôles.
- Seconde passe : Bibliothèque → Live → Découvrir → Créer → Studio testé avec données réelles. Une seule navigation produit, aucune ancienne navigation Pilot ; à 1440 px, header et Live commencent/terminent tous deux à 94 px. Bibliothèque, Créer et Studio à 390 px sans débordement horizontal ; création audio conserve `/upload`. Aucune erreur console capturée sur ce parcours.
- Bouton Espaces : nom accessible explicite conservé en mobile lorsque le texte est masqué. Logo transparent réutilisé, pas de nouveau bitmap.

## Limites

- Contrôle mobile en navigateur redimensionné, pas sur téléphone physique.
- Aucun test de clavier OS ou lecteur d'écran réel dans cette passe.
- La première passe n'avait aucune playlist disponible. La seconde affiche une playlist réelle déjà présente dans le compte ; aucune playlist créée par cette passe. Aucun contenu fictif ajouté.
- Revue créative de cette seconde candidate encore attendue. Pages publiques d'entrée, authentification, administration et sous-produits indépendants restent hors navigation produit.

Captures locales : `artifacts/create-library-redesign/` (non destinées au déploiement).
