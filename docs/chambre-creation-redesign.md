# La Chambre Sonore — création et publication

Candidate locale, 13 septembre 2026. Aucun commit, staging, push ou déploiement réalisé pour ce lot. La validation de ce document porte sur la présentation et les contrats de source ; elle ne constitue pas un smoke authentifié de génération, de paiement ou de publication.

## Direction appliquée

La création reprend le noir profond, le cobalt, l’argent froid et les caractères sans sérif serrés de l’entrée approuvée. Les pages éditoriales donnent une place à la sculpture ; les ateliers gardent des champs calmes et lisibles. Les vues de travail ne deviennent pas des diaporamas : leurs formulaires, bibliothèques et panneaux conservent leur navigation et leur défilement.

L’image `public/brand/chambre/membrane-cobalt.png` est réutilisée comme décoration (sans requête de génération d’image, sans nouveau fichier média). Le prototype et les composants de l’entrée approuvée ne sont pas modifiés. Le mouvement ajouté est une dérive CSS lente de cette image, désactivée en préférence de mouvement réduit ; il ne prétend pas représenter un signal musical.

## Inventaire du lot

| Surface | Changement de présentation | Fonctionnement conservé |
| --- | --- | --- |
| `/create` | Couverture « FAIS / VIBRER », sculpture asymétrique, intentions et parcours numérotés, atelier IDE distinct | Les quatre intentions, les suggestions personnalisées, les destinations originales, `challengeId`, les redirections d’arrivée et les liens de retour |
| `/create/variation` | Couverture « UNE AUTRE / DIRECTION », liste de sources à pochettes inclinées, contraste des erreurs | Connexion, liste des sources autorisées, crédit de l’auteur, identifiants et type de source, challenge et mode remix |
| `/ai-generator` | Identité d’atelier compacte, panneaux intention / versions / inspection, contrôles cobalt | Modes, modèles, prompts, paramètres, génération et polling, solde et achat de crédits, streaming, pistes, export, bibliothèque, source remix et gestes mobiles existants |
| `/ai-library` | Couverture éditoriale, compteurs réels en colonnes, filtres mobiles repliables naturellement, état de connexion cohérent | Recherche, filtres, favoris, téléchargement, lecture, publication, actualisation et données existants |
| `/studio` | Barre IDE, repère cobalt, colonnes de travail séparées par des filets, panneau de construction et dock mobile | Store, projets, recherche, presets, assets, queue, timeline, inspecteur, comparaison et commandes existants |
| `/studio/library` | Avertissement historique intégré au thème | Démonstration explicitement non persistante et non fonctionnelle ; le lien vers la vraie bibliothèque IA demeure. Cette route n’est pas réintroduite comme produit réel |
| `/upload` | Couverture de sortie, résumé des fichiers, plan de travail à trois zones | Types de sortie, fichiers et limites du compte, étapes/validations, métadonnées, droits, visibilité, programmation, upload et publication |
| `/publish` | Introduction typographique et sculpture, étapes de publication plus lisibles | Guide existant, destinations, informations de droits et FAQ |
| `/clips/new` | Couverture Clip, compteur d’étape réel, aperçu vidéo et panneau d’édition séparés | Contraintes vidéo, choix du son, offset, légende, tags, identité Clip et file d’envoi |
| `/clips/[id]` | Présentation du Clip et crédit du son lisibles sur noir, compteurs corrigés pour le fond sombre | Métadonnées, média Clip réel, contrôles vidéo explicites, identité Clip dans Live, lien distinct vers la piste source |
| Surfaces secondaires | Inspecteur IA, barre de contexte créatif, statut d’upload et approbations des variations intégrés au thème | Fermeture, callbacks, confirmation avant refus, décisions approve/reject, abonnement au vrai statut d’upload, reprise d’un échec |

### Fichiers réellement modifiés dans ce lot

- `components/v2/creation-v2.css`
- `app/create/page.tsx`, `app/create/variation/page.tsx`
- `app/ai-generator/page.tsx`, `app/ai-library/page.tsx`
- `app/studio/StudioClient.tsx`, `app/studio/library/page.tsx`
- `app/upload/page.tsx`, `app/publish/page.tsx`
- `app/clips/new/page.tsx`, `app/clips/[id]/page.tsx`
- `components/create/CreateArrivalBanner.tsx`
- `components/clips/ClipUploadIndicator.tsx`
- `components/variations/PendingApprovalsModal.tsx`
- `components/ai-studio/LibraryMiddlePanel.tsx`, `components/ai-studio/TrackInspector.tsx`, `components/ai-studio/GenerationTimeline.tsx`
- `components/studio/LeftDock/GeneratorForm.tsx`, `components/studio/ui/MobileTabs.tsx`

Les autres composants internes AI/Studio restent en place et héritent du thème de leur atelier ; ils ne sont pas présentés comme réécrits ou testés individuellement. Les hooks et contrôleurs de ces répertoires ne sont pas modifiés. Les anciens rendus cachés déjà présents dans le gros composant AI Generator ne sont pas supprimés dans ce lot.

Une corruption visible du raccourci de navigation dans la palette AI (`↑↓`) est corrigée. Les commentaires historiques et les chaînes de construction de prompt ne sont pas réencodés aveuglément : modifier le contenu transmis à un générateur sortirait du changement de présentation.

## Préservation et contrôle des contrats

Avant chaque première modification, les 19 fichiers existants ci-dessus ont été copiés, avec leur chemin relatif exact, sous `artifacts/chambre-full-redesign/before/creation/`. Ces copies incluent les changements locaux préexistants, pas seulement HEAD. Aucun environnement, secret ou dump n’est copié. Les différences Git par rapport à HEAD incluent d’anciens travaux et ne sont donc pas attribuées intégralement à ce lot.

Le test dédié compare les AST avant/après des 18 TSX : tous les handlers JSX, effets React, appels `fetch`, navigation, imports et constructeurs restent identiques. Cette vérification passe sur les copies locales. Elle est explicitement ignorée dans une future installation où les snapshots locaux ne sont pas présents ; les autres tests contractuels restent exécutables.

Aucun endpoint, contrat DB, paiement, autorisation, provider, AudioCore, historique ou donnée n’est modifié. Aucun second moteur audio n’est introduit. Aucun morceau, compteur ou statut de génération fictif n’est ajouté. Les couleurs d’erreur et de succès restent sémantiques et distinctes des accents cobalt.

## Résultats de vérification du lot

- `node --experimental-strip-types --test tests/v2-creation-presentation.test.mjs tests/creation-handoffs-phase4b7.test.mjs tests/chambre-creation-redesign.test.mjs` : **34/34 PASS**, dont 9 nouveaux tests et la comparaison AST avant/après.
- Parse TypeScript/TSX des 18 fichiers : **PASS** ; parse PostCSS de la feuille de style : **PASS**.
- `git diff --check` sur les fichiers du lot : **PASS** (avertissements de conversion LF/CRLF seulement).
- Aucun fichier ajouté à l’index par ce lot. Les snapshots et les tests sont des artefacts locaux de validation, pas un signal de déploiement.

## Réserves explicites

La revue visuelle desktop/mobile, le type-check global et le build sont coordonnés au niveau de la refonte complète. Ils ne sont pas revendiqués comme exécutés par ce lot.

Les workflows authentifiés et payants n’ont pas été activés pour faire des captures : aucune génération payante, aucun achat de crédits, aucun envoi de fichier, aucune publication, aucune approbation/refus réel, aucune suppression et aucun paiement de test n’ont été réalisés. Les écrans authentifiés demandent encore un smoke avec un compte autorisé avant validation produit. Android/clavier OS réel et lecteur d’écran réel ne sont pas testés dans ce lot.

## Addendum — reprise après rejet de la conclusion « terminé »

Le premier passage n’était pas une refonte complète : son bandeau Create précédait encore les outils, les vrais champs AI conservaient du beige/brun et la numérotation confondait génération et publication. Cette reprise corrige ces écarts précis, pas l’ensemble de Synaura.

- **Create recomposé** : identité et intentions à gauche, proposition et CTA immédiatement à droite sur desktop ; mobile dans l’ordre identité → intention → CTA → explications. Le poster préalable de 540 px est supprimé. Les quatre choix, descriptions, étapes, alternatives, suggestions et destinations restent disponibles.
- **Matière séparée du texte** : image dans sa propre colonne, mélange appliqué au conteneur et fondu horizontal + vertical. Aucun nouvel asset ou moteur, aucun déplacement supplémentaire après contrôle du premier écran.
- **AI réel** : états beige/brun remplacés par les tokens, y compris modes inactifs, sources, tags, hover, paramètres et coût. Les valeurs internes des modèles et des modes restent exactes. États pressés explicités pour les contrôles existants. La hiérarchie est désormais intention → versions → détails ; les sous-sections du composer sont « Affiner le rendu » et « Lancer la génération », sans fausse étape Publication.
- **IDE** : libellés utilisateur français, sans changement des commandes ou paramètres. Les valeurs techniques transmises (ex. `V4_5PLUS`, `custom`) ne sont pas traduites.

Les cinq fichiers applicatifs de cette reprise, le rapport et le test avant modification sont conservés sous `artifacts/chambre-resumption/before/creation/`. Les premiers snapshots ne sont pas écrasés.

Tests ciblés : **37/37 PASS** (dont 12 dédiés). Après le dernier fondu CSS : les 12 dédiés et `git diff --check` repassent. L’audit AST reste strict sur tous les handlers, effets, appels externes, constructeurs et imports. Seule exception précisément énumérée pour la correction Publish du lot commun : ajout de `SynauraAppShell, SynauraRouteNav, SynauraTopBar` depuis `@/components/synaura/SynauraShell` et de `HandoffReturn` depuis `@/components/navigation/HandoffReturn`. Aucun autre import n’est exempté.

Mesure navigateur communiquée par la QA principale à **390 × 844** : CTA Create de **y=649 à y=695**, intentions visibles, aucun débordement horizontal. Les captures finales et la revue desktop restent coordonnées par cette QA. Les vrais écrans AI/IDE authentifiés ne sont pas déclarés visuellement validés par les seuls tests de source. Aucun build, déploiement ou workflow payant n’a été lancé dans ce lot de reprise.
