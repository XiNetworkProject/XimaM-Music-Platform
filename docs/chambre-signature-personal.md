# Chambre signature — Communauté, bibliothèque, activité

Candidate locale de présentation, 13 septembre 2026. Aucun commit ou déploiement dans ce sous-lot.

## Trois compositions, trois fonctions réelles

| Surface | Présentation reprise | Contrat conservé |
| --- | --- | --- |
| `/community` | Grande entrée « Le son. Le lien. », signal orbital cobalt/chrome, liens directs puis quatre destinations indexées. Chaque club rapproche sa promesse de sa dernière discussion réelle, ou de son état vide explicite. | `COMMUNITY_CLUBS`, catégories, agrégats, auteurs, destinations et préférences existantes. |
| `/library` | Collection de pochettes et disques, recherche et reprise d’écoute intégrées au titre, cinq collections indexées, grille/liste distinctes, pistes à hauteur naturelle. État invité et erreur composés sans faux morceaux. | Lecture explicite, tri, recherche, queue, favoris, téléchargements, playlists et modales existantes. |
| `/notifications` | Journal chronologique à rail de filtres sur desktop, index replié en rangées sur mobile, cartes datées avec suppression accessible. L’état invité explique l’espace au lieu de simuler de l’activité. | Notifications, filtres, pagination, lecture/suppression, destinations et guard de session inchangés. |

La palette reste celle des tokens Chambre existants : noir, cobalt et argent. Les formes décoratives sont en CSS et `aria-hidden`, sans assets factices ni images de prétendus utilisateurs. Aucun nouveau mode de données ou système de communauté n’est introduit.

## Périmètre et préservation

Fichiers produit modifiés :

- `app/community/page.tsx`
- `app/library/LibraryClient.tsx`
- `app/notifications/page.tsx`
- `components/v2/personal-v2.css`, uniquement le nouveau bloc `Chambre signature` ajouté en fin de fichier.

Snapshots avant édition : `artifacts/chambre-signature/before/personal/`, avec les mêmes chemins relatifs et toutes les modifications préexistantes conservées. L’empreinte AST originale exportée par `tests/chambre-personal-redesign.test.mjs` est réutilisée **sans modification, exception ou nouvelle baseline**. Pour les trois TSX, imports, code hors JSX, états, guards, requêtes et expressions comportementales sont identiques. Le test compare également tous les styles précédant le bloc ajouté à leur snapshot : ils restent identiques.

Messages, conversation/composer, panneau NotificationCenter, routes internes du forum, formulaires de posts, City, récompenses, services, legacy/météo/admin ne sont pas repris dans cette passe. Les modales bibliothèque déjà corrigées sont conservées. Le shell/motion global appartient au lot principal. Entrée/prototype gelés ; aucun changement AudioCore, cache, history, handoff, auth, endpoint, DB, paiement, native ou infrastructure.

## Classement et données : limites explicites

Les clubs restent `feedback`, `collab`, `remix` et `ai` (catégorie `ai_prompt`). Les préférences créatives existantes peuvent seulement en prioriser l’ordre ; les indices de présentation ne représentent ni un classement de popularité ni un nombre de membres. Aucun club n’est masqué. Les compteurs et derniers auteurs viennent toujours de `/api/community/clubs`.

En environnement local sans DB exploitable, un club affiché vide ne prouve pas qu’il est vide en production. Le comportement existant peut également aboutir à cet état après une réponse de chargement non exploitable ; aucune nouvelle gestion métier d’erreur n’a été introduite ici. La dette historique `question` / `suggestion` reste hors périmètre : aucune reclassification ni reconstruction d’origine.

Les gardes invités sont inchangées : `/library` conserve `!userId` et son action `/auth` ; `/notifications` conserve `sessionStatus === 'unauthenticated'` et son lien de connexion avec callback. Ni session fabriquée, ni interception réseau, ni notification/playlists factices.

## Contrôles de source

`tests/chambre-signature-personal.test.mjs` : **26/26 PASS**, soit dix contrôles propres à cette passe et seize tests originaux chargés par le comparateur. L’exécution conjointe avec `chambre-personal-resumption` et `chambre-rewards-continuation` donne **77/77 PASS** ; ce total inclut la réexécution des seize tests originaux dans chaque processus, ce ne sont pas 77 nouveaux scénarios.

Couverture : syntaxe TSX/CSS, préservation AST stricte, confinement des sélecteurs, données et destinations réelles, garde invité, cinq collections, Play visible dans les deux vues, modales scrollables/safe area conservées, journal et actions de notification, règles mobile 767/359, retour à la ligne et tailles tactiles, focus visible, reduced motion, absence de `display:none` / `visibility:hidden` ajoutés et contraste AA calculé du bouton principal via `--v2-accent-fill`.

`git diff --check` ciblé : **PASS** (avertissements habituels LF/CRLF uniquement). Aucune modification de secret ou fichier d’environnement. Aucun stage, commit, push, build, serveur ou déploiement lancé par ce sous-lot.

## Revue navigateur : ne pas confondre les preuves

La revue visuelle est centralisée par l’agent principal. Cette passe source ne prétend pas valider visuellement toutes les données connectées. Sélecteurs utiles pour ses captures :

- Invité Community : `.chambre-signature-community`, `.signature-club-grid`.
- Invité bibliothèque : `.signature-library-guest`.
- Invité notifications : `.signature-activity-guest`.
- Avec une vraie session uniquement : `.signature-collection-header`, `.signature-library-records`, `.signature-activity-journal`.

Les contrôles de CSS responsive/reduced motion ne remplacent pas une capture ni une interaction réelle à 390/1440. Chargement authentifié, mutations, lecture audio, Android/Gboard et NVDA ne sont pas déclarés validés par ce document. Les écrans connectés chargés de données et les parcours complets restent à examiner dans leur environnement réel. Cette reprise de trois surfaces ne signifie pas que tout Synaura est terminé.
