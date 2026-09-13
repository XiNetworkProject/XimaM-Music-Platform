# Chambre Signature — espaces de création

Statut : **candidate locale de présentation**. La validation produit reste ouverte et distincte des tests source. Aucun déploiement ni commit dans ce sous-lot.

## Changements réalisés

| Espace | Composition et changements concrets |
|---|---|
| Créer | Pupitre d’intentions : libellé et objectif de chaque choix sur desktop, parcours réel matérialisé par ses trois étapes, motif géométrique décoratif qui suit l’intention sélectionnée. Le CTA reste avant la description et les étapes. Le Studio devient un bloc de travail distinct avec son motif de versions empilées. |
| Publier | Une pochette éditoriale chrome/cobalt accompagne l’introduction. Le plan réel de préparation est organisé en trois colonnes sur desktop et en liste sur mobile ; questions/réponses lisibles en dessous. La pochette est décorative, pas une fausse publication utilisateur. |
| Bibliothèque IA | Compteurs réels intégrés dans un registre d’archive ; générations en deux colonnes desktop, versions identifiables et commandes sur une ligne dédiée pouvant revenir à la ligne. Les six icônes ne compressent plus le titre contre la pochette. États vides, recherche, filtres, favoris, partage et liste globale conservés. |
| AI Generator | Cadre de compositeur distinct : en-tête d’instrument, repères de mode, surface de réglages, commande de génération avec son coût existant, poignées de séparation et inspecteur. Aucun grand décor sous les champs ; aucun changement des colonnes redimensionnables, du composer mobile ou des propriétaires de scroll. |
| Studio IDE | Châssis discret, identité dédiée, sélection des sections mieux lisible et console différenciée. Aucun changement des modes Simple/Complet, onglets, panneau sources, console, paramètres, formulaires ou contrôles musicaux. |
| Import/Upload | Dossier de sortie : en-tête compact, étapes lisibles avec étape courante explicitée, progression issue de la valeur réelle, dropzones encadrées et états de drag reliés aux booléens existants. Les panneaux conservent leur ordre visuel **et** leur ordre clavier ; le retour mobile n’est pas masqué. |

Les noms accessibles manquants dans les rangées IA concernées ont été ajoutés aux commandes existantes (écouter, télécharger, favoris, partage, variation/remix) ; aucun handler ni contrôle nouveau. Les trois filtres existants exposent leur sélection avec `aria-pressed`.

## Mouvement et responsive

- Arrivée décorative de la pochette Publier : 900 ms, une seule fois ; aucun texte essentiel ni formulaire ne dépend de cette animation.
- Changement de géométrie du motif d’intention, reflet au survol/focus du CTA Create, léger déplacement de l’icône de dépôt au survol. Aucune nouvelle animation continue, aucune analyse audio, aucune boucle GPU.
- `prefers-reduced-motion` supprime explicitement ces ajouts. Les animations préexistantes restent sous leur contrat et leurs contrôles globaux, non remplacés dans ce passage.
- CTA Create mobile conservé avant le texte explicatif ; choix tactiles de 44 px. Versions IA : actions de 44 px sur mobile, retours à la ligne sans disparition de commande. Adaptations 767 px, tablette et 360 px.
- Aucun changement de l’entrée approuvée, du prototype ou de l’asset `membrane-cobalt.png`. Ce dernier est réutilisé sans édition dans la pochette décorative.

## Fichiers et sauvegardes

Sources modifiées :

- `app/create/page.tsx`
- `app/publish/page.tsx`
- `app/ai-generator/page.tsx`
- `app/ai-library/page.tsx`
- `app/studio/StudioClient.tsx`
- `app/upload/page.tsx`
- `components/v2/creation-v2.css`

Nouveaux livrables : `tests/chambre-signature-creation.test.mjs` et ce document. Copies de chaque source avant modification sous `artifacts/chambre-signature/before/creation/`, chemins relatifs préservés. Aucune copie ou baseline antérieure écrasée ; aucune modification utilisateur supprimée.

## Préservation vérifiée

L’empreinte AST issue des copies **avant** Signature correspond exactement à celle de la candidate pour :

- **106 imports** — aucun import ajouté, retiré ou remplacé ;
- **339 bindings d’événement** ;
- **372 bindings de contrôle/navigation** : liens, valeurs, valeurs par défaut, disabled, clés, refs, types, checked, required, accept, multiple, action/method ;
- **2 636 appels sans JSX**, y compris effets, génération, requêtes et mutations ;
- **101 constructeurs**.

Pas d’exception générale, pas de nouvelle empreinte calculée depuis la candidate pour l’accepter. Les anciens tests de création et leurs baselines n’ont pas été modifiés. API, contrats DB, prix/coûts, autorisations, authentification, AudioCore, upload, navigation/handoffs et paiements sont hors des modifications.

## Résultats et limites

Suite ciblée : **44 tests PASS**, 0 échec, 0 ignoré — 7 Signature, 12 création précédents, 25 présentation/handoffs. TSX et CSS parsés dans ce gate. Il s’agit de contrats source, pas de 44 parcours navigateur.

La tâche principale possède les captures Create/Publish et les contrôles globaux. Ce sous-lot n’a piloté aucun navigateur, serveur, build global ni type-check global. Il ne déclare pas validés les écrans privés peuplés AI/Library/IDE/Upload, les paiements, l’envoi de fichier ou une génération réelle. Ces parcours nécessitent encore une revue locale authentifiée appropriée. Aucun compte de démonstration ni contenu factice n’a été ajouté au produit.

Ni staging, ni commit, ni push, ni déploiement.
