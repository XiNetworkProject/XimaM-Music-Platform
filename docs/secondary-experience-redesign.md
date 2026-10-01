# Synaura — pages secondaires, candidate locale

## Décision et périmètre

La demande « faut tout faire » porte sur les pages visuelles restant à harmoniser après les refontes de l’entrée, Live, Studio, profils, recherche, communauté et statistiques. Cette passe travaille dans le dépôt existant, sans nouvelle direction artistique ni remplacement des fonctionnalités.

**Candidate locale, non publiée.** Aucun commit, push, migration ou déploiement dans cette passe. Les modifications préexistantes de recherche, recommandations, abonnements, statistiques, parcours produit et applications natives sont conservées.

## Pages traitées

| Groupe | Travail de présentation | Fonctionnement conservé |
| --- | --- | --- |
| Bibliothèque | En-tête compact, reprise d’écoute, recherche, filtres arrondis, pochettes et listes ; organisation adaptée à 390 px. | Playlists, favoris, récents, hors-ligne, file, recherche et commandes audio. |
| Playlist / album | Identité centrée sur la pochette, informations lisibles, liste des morceaux ; statistiques de playlist en trois colonnes sur mobile. | Ordre, recherche, filtres, lecture, aléatoire, ajout à la file, partage. |
| Publication audio | Une surface de travail, trois étapes, aperçu distinct ; sélecteur Single/EP/Album unique à l’écran ; événements dans un volet facultatif. | Conditions d’accès aux étapes, fichiers, droits, quotas et soumission. Aucun import réel lancé. |
| Guide de publication | Cartes audio/clip/post harmonisées ; texte Clip non limité à la vidéo verticale. | Mêmes liens et parcours de publication. |
| Paramètres | Index latéral sur PC, grille de rubriques sur mobile, formulaires et identité simplifiés. | Données, sauvegarde et permissions existantes. Aucun réglage enregistré. |
| Notifications | Journal lisible, filtres sur plusieurs lignes, actions accessibles et tactiles. | Chargement, lecture et suppression inchangés. Aucun marquage ou retrait déclenché. |
| Community interne | Club, rédaction, discussion, posts et FAQ harmonisés ; choix d’intention compacts et champs de rédaction nommés. | Brouillon, pièces jointes, publication, réponses et destinations. |
| Clip public | Taille native, `object-fit: contain`, hauteur bornée par l’écran ; suppression du cadre forcé 9:16. | Identité du clip, URL vidéo, poster, contrôles natifs, lecture volontaire. |
| City / défis | Titres, événements et participations harmonisés ; défi raccordé à la navigation commune. | Statut, inscription, votes et récompenses inchangés et non déclenchés. |
| Boosters | Entrée, cartes et actions harmonisées. | Inventaire réel, boutique et missions existants. Aucun achat, tirage ou activation. |
| Support / FAQ | Formulaire et ressources harmonisés, recherche et catégories FAQ sans défilement horizontal obligatoire. | Contact, recherche et réponses réelles ; aucune demande envoyée. |
| Erreur / introuvable | Surface de récupération cohérente, liens de retour conservés. | Réessai et frontières d’erreur inchangés. |

La couche CSS est limitée à `.experience-refresh`, sous `.synaura-chambre`. Les composants déjà refondus restent en place. Aucun nouveau canvas, moteur d’animation, abonnement audio ou conteneur vertical scrollable ajouté. La lumière décorative suit la pause d’ambiance existante, la réduction des mouvements et les décisions du contrôleur d’ambiance sur visibilité/économie de données.

## Corrections découvertes pendant la revue

- Les règles historiques superposaient des grilles sur album et playlist : la nouvelle composition utilise une seule grille d’identité. Les captures intermédiaires incorrectes ne constituent pas une validation.
- La page défi utilisait encore l’ancien dock. Ajout exact de la famille `/challenges` au contrôleur de navigation commun ; aucun nouveau modèle de navigation ni changement des autres routes.
- Le détail d’une discussion Community pouvait finir avec seulement un lien de retour après un 404 API. Un état « Discussion indisponible » apparaît maintenant, avec le retour au forum. **Cela ne corrige pas l’erreur de données/API elle-même.**
- La FAQ avait des catégories en défilement horizontal et un bloc clair incohérent avec les autres surfaces. Catégories repliables sur plusieurs lignes, état sélectionné annoncé, panneau aux couleurs existantes.
- Un second clip réel, vertical (720×1280), restait dans un cadre de 150 px malgré ses métadonnées disponibles. Un adaptateur de présentation conserve le même élément `<video>` et renseigne seulement son ratio CSS à partir des dimensions natives (au montage, aux métadonnées et au changement de dimensions). Vérifié : horizontal 1280×720 → 342×192 px ; vertical 720×1280 → 342×574 px avec limite d’écran et `contain`. Pas de lecture, pause, seek, nouveau flux ou appel réseau ajouté.

## Vérifications

Les vérifications navigateur utilisent le compte de test existant et le serveur local relié à la base réelle par le tunnel SSH déjà utilisé dans le projet. Aucune configuration distante modifiée. La présence de données réelles ne signifie pas que toutes les mutations ont été testées.

| Parcours observé | Résultat |
| --- | --- |
| Bibliothèque | 1 playlist, 3 favoris, 40 récents chargés ; bascule des favoris et mise en page mobile vérifiées. |
| Playlist publique | 11 morceaux réels ; filtre « Creation 11 » donnant 1/11, puis effacement rétablissant la liste. |
| Album | 8 morceaux et identité réelle, composition PC et mobile contrôlée. |
| Paramètres, upload, rédaction | Contrôles existants visibles, aucune soumission. |
| Notifications | 19 notifications réelles, contrôle « Tout lire » conserve son nom accessible mobile. |
| Clips | Deux formats réels : 1280×720 et 720×1280 ; affichage `contain`, ratio natif appliqué, vidéos toujours en pause. |
| Post individuel | Publication et couverture du son attaché chargées ; aucun like/commentaire/lecture déclenché. |
| Défi | Défi réel « Carte blanche créative », terminé, 0 participation, bouton désactivé ; une navigation commune. |
| FAQ | Recherche « formats audio », ouverture d’une vraie réponse, état `aria-expanded` et texte affichés. |
| Community détail | 404 API constaté pour deux identifiants présents dans la liste ; état de récupération vérifié. |
| Page inexistante | HTTP 404 et retour à l’accueil disponibles. |

Captures et revue dans `artifacts/remaining-experience/`. Largeurs CSS contrôlées : 1440 et 390 px, puis 834 px pour bibliothèque et réglages. Le navigateur avait un zoom préexistant de 80 % ; les dimensions demandées à son outil ont été compensées et `innerWidth` vérifié. Le canevas de capture peut conserver une marge noire : elle n’est pas un débordement du site. Sur les vues mobiles mesurées, largeur du document = 390 px. Ce n’est pas un essai sur téléphone physique. Les overrides temporaires de dimensions ont été retirés après les essais.

### Contrôles automatiques

- Suite finale : **961/961 PASS**, aucun test ignoré ou annulé, après les ajustements FAQ et le correctif de ratio vidéo.
- `npm run type-check` : **PASS après le build final**, correctif de ratio inclus.
- `npm run build` : **PASS**, correctif de ratio inclus, 101 pages statiques générées. Avertissement non bloquant : données Browserslist anciennes, non mises à jour hors périmètre.
- `git diff --check` : **PASS**.
- `node scripts/secondary-experience-review.mjs` : **32 fichiers, aucune occurrence de secret détectée, index vide**. Scan heuristique limité aux sources de cette passe, pas une certification de tout l’historique Git ou des artifacts.

Le build production local a été démarré avec `next start` via le lanceur connecté existant. La bibliothèque et l’import reconnaissent la vraie session ; le contrôle de pause passe de `running` à `paused`, puis revient à `running` après restauration du choix initial. Aucun message console de niveau error n’est remonté sur ce premier parcours compilé bibliothèque → upload. Le contrôle HTTP non authentifié de 17 pages distingue les 14 réponses publiques 200 des trois redirections attendues vers la connexion (bibliothèque, import, réglages) ; ces redirections ne sont pas comptées comme une validation des données privées.

Le build final avec le correctif vidéo a ensuite été relancé : portrait réel à 390 px, ratio 720/1280, cadre de 573,9 px, toujours en pause. Le navigateur conserve un `CLIENT_FETCH_ERROR` NextAuth durant l’arrêt volontaire du serveur local pour compilation ; ce log ne justifie pas une affirmation de console totalement vide sur toute la session. La reconnexion retrouve la session et les données. Contrôle supplémentaire des réglages à 834 px : pas de débordement horizontal, navigation commune.

Les 20 empreintes de comportement JSX/TypeScript sont calculées depuis des copies locales **antérieures à cette passe**, incluant les changements utilisateur déjà présents. Elles vérifient le code hors présentation, les expressions, conditions, destinations et actions. Elles ne remplacent pas des essais réels d’envoi, de paiement ou d’audio. Les tests historiques sont conservés ; seules les projections exactes du nouveau nom de classe de rédaction et de l’import CSS ont été adaptées.

Exception revue supplémentaire : le remplacement exact du tag vidéo par l’adaptateur de taille et son import sont projetés dans le test de présentation. Ses attributs source/poster/contrôles restent vérifiés. Trois tests exécutent l’adaptateur : élément vidéo unique et propriétés transmises, dimensions portrait/paysage/carré, dimensions invalides. Le test historique de création n’autorise que cet import précis ; aucun hash historique n’a été remplacé.

## Réserves, sans faux feu vert

1. **Community détail : OPEN.** Liste publique 200, mais les détails de deux posts existants répondent 404. Pas de modification d’endpoint, de taxonomie ni de contenu pour fabriquer un résultat positif. Réponses/modération de ces discussions non validées par ce parcours.
2. **FAQ éditoriale : à réconcilier.** Une réponse réelle annonce des tailles de fichiers qui ne correspondent pas à la limite de 80 MB affichée par le formulaire du compte testé. Contenu stocké non réécrit dans cette passe visuelle.
3. Le son attaché au post testé affiche « Artiste inconnu » malgré sa pochette présente ; dette de métadonnées existante, non remplacée par un auteur inventé.
4. Pas de test physique Android/Gboard, NVDA, achat, envoi de support, publication, suppression, participation ou récompense. Aucun crédit consommé volontairement.
5. Les cadrages horizontal et vertical réels ont été vérifiés ; ce contrôle seul ne prouve pas tous les formats ni la lecture/audio sur chaque navigateur. Lecture native non déclenchée pendant ces captures.
6. Pas de réaudit des interfaces admin, météo, sous-produits externes, textes légaux ou applications natives. Les refontes déjà réalisées ne sont pas relancées.

## Retour arrière et prochaine étape

Les copies de départ de cette passe se trouvent dans `artifacts/remaining-experience/before/`. Ne pas faire de revert global : le worktree contient également le travail antérieur de l’utilisateur. Aucun fichier n’a été ajouté à l’index. Le serveur dev connecté a été relancé sur `http://127.0.0.1:3000`, après l’arrêt du `next start` de validation. La prochaine étape est la revue visuelle locale, puis une décision explicite sur les réserves et un éventuel déploiement.
