# Chambre Sonore — reprise des récompenses

Candidate locale, 13 septembre 2026. Périmètre borné : ouverture quotidienne, roue, révélation des packs et leurs points d’entrée. Cette note n’annonce ni déploiement ni refonte complète validée.

## Présentation reprise

- `components/BoosterOpenModal.tsx` : ouverture en deux zones sur desktop, objet scellé et action clairement séparés ; empilement mobile. Résultat de hauteur naturelle avec nom, description, rareté, multiplicateur et durée lisibles. Plus de carte à hauteur fixe qui coupe les descriptions longues.
- `components/DailySpinModal.tsx` : en-tête, corps scrollable, roue responsive, vraie légende des sept segments et footer fixe dans le panneau, safe area comprise. Desktop : roue à gauche, disponibilité/légende/résultat à droite ; mobile : même contenu empilé. La roue canvas et ses couleurs sémantiques ne sont pas recalculées. Ses petits textes sont complétés par la légende HTML lisible.
- `components/BoosterPackOpenModal.tsx` : objet scellé noir/cobalt/argent, révélation des cartes avec titres non tronqués ; contrôles Auto/Tout révéler et Suivant/Fermer atteignables avec corps scrollable. Raretés toujours identifiables par leurs noms et icônes.
- `app/boosters/BoostersClient.tsx` : entrées quotidiennes et cartes Starter/Pro composées dans la même direction, sans modification des descriptions de packs, restrictions de plan ou compteurs.
- `components/v2/personal-v2.css` : styles ciblés ; les nouveaux panneaux ne dépendent plus d’un remplacement global de couleurs. Les séquences conservent particules, foil, flash, rotation, déchirure et révélation. Les suppressions historiques de gradients/ombres excluent maintenant ces panneaux pour ne plus effacer leurs effets. Reduced motion reste pris en compte.

Les panneaux et boutons utilisent les tokens existants, sans nouvelle palette. Les rares accents colorés conservés sont les identifiants et effets sémantiques des raretés/segments déjà présents, pas des surfaces purple/pink. Les fonds de résultat de la roue ne reprennent plus une pleine couleur de segment.

## Préservation stricte

Copies des quatre TSX et de la feuille CSS avant édition : `artifacts/chambre-continuation/before/rewards/`, chemins conservés. Elles incluent les modifications préexistantes et ne remplacent pas un checkpoint Git.

L’empreinte originale de `tests/chambre-personal-redesign.test.mjs` est réutilisée **sans changement ni exception** : mêmes imports, code hors JSX et expressions comportementales dans les quatre fichiers. Un contrôle complémentaire compare les propriétés inline d’animation/transition/transformation afin de couvrir également les timings de présentation que l’empreinte exclut habituellement.

Sont inchangés : requêtes GET/POST, guards, callbacks, probabilités et ordre des segments, rang et tri des raretés, stock/quotas/plans, compteurs, valeurs, tirage serveur, application des boosters, séquence temporelle et AudioCore. Aucun hook, endpoint, schéma ou traitement de paiement modifié. Les seules différences sont JSX, classes, labels et styles.

## Revue isolée sans mutation

| Composant | Props existantes utilisables | Limite explicite |
| --- | --- | --- |
| `BoosterOpenModal` — fermé/scellé | `isOpen`, `onClose`, **omettre `onOpenBooster`** ; `isOpening` permet d’examiner le contrôle désactivé. | Sans callback d’ouverture, aucune requête ni allocation de booster. Ne pas afficher cela comme un booster réellement acquis. |
| `BoosterOpenModal` — résultat | `item: { inventoryId, booster }` ou `openedBooster` ; fournir des métadonnées de présentation marquées **TEST VISUEL** dans une page de revue distincte, sans callback de mutation. | Rareté/nom/description/multiplicateur/durée servent seulement à rendre la carte de test ; aucun inventaire utilisateur créé. |
| `BoosterPackOpenModal` | `isOpen`, `packKey`, `received`, `onClose`. Une liste de cartes **TEST VISUEL** peut être révélée via les commandes existantes. | Ce composant ne fait aucune requête : ouverture, Auto, Tout révéler et Suivant ne changent que ses états visuels locaux. Aucun achat/claim validé par ce parcours. |
| `DailySpinModal` | Seulement `isOpen` et `onClose`. | **L’ouverture déclenche son GET naturel `/api/daily-spin`.** Aucun prop actuel ne permet de rendre un gain ou d’activer la roue sans état serveur. En revue non authentifiée, ne pas intercepter la réponse ni simuler une session ; le bouton reste désactivé sans autorisation. Aucun gain réel ou état gagnant prétendu validé. |

Toute fixture doit rester dans une revue explicite séparée du produit, sans faux signal persistant et sans présenter ses valeurs comme un contrat de probabilités/prix. Aucun bypass d’authentification, faux endpoint ou prop de désactivation des guards n’a été ajouté.

## Contrôles et réserves

`tests/chambre-rewards-continuation.test.mjs` : **25/25 PASS** (neuf contrôles ciblés de source, auxquels s’ajoutent les seize tests personnels chargés par le comparateur existant). Ils couvrent la syntaxe, les empreintes strictes, la chorégraphie, les points d’entrée, le scroll/safe area, les actions, les valeurs et le contraste AA des boutons principaux. `git diff --check` ciblé : PASS ; avertissements de normalisation LF/CRLF uniquement.

La revue navigateur est centralisée par l’agent principal. Ce sous-lot n’a lancé aucun navigateur, build, serveur, achat, tirage, claim, application de booster, commit ou déploiement. Les gains réels, mutations authentifiées, Android/Gboard et NVDA ne sont pas validés par des tests de source ou des fixtures. Les autres services et la personnalisation de conversation ne sont pas déclarés terminés par cette reprise.
