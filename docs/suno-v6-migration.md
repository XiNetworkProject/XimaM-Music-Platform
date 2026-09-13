# SunoAPI V6 — candidate locale Synaura

## Périmètre et décision produit

Demande : intégrer la famille V6, annoncer sa disponibilité dans le produit et fiabiliser les fonctions simples du générateur et du Studio existants. Aucun déploiement, commit, envoi d’email, notification globale ou achat fournisseur automatique.

Répartition explicitement choisie par le propriétaire :

| Formule | Modèles pour une nouvelle génération |
| --- | --- |
| Free | V6 Mini |
| Starter | V6, V6 Wild, V6 Mini |
| Pro | V6, V6 Wild, V6 Mini |

Les prix, allocations de crédits, packs et coûts d’action restent inchangés : 12 crédits Synaura par génération ou remix. « Mini » ne signifie pas un tarif fournisseur vérifié inférieur. Aucun changement de droits non liés aux modèles.

## Contrat fournisseur vérifié

Consultation des pages et du schéma officiels de **SunoAPI**, fournisseur tiers utilisé par Synaura, le 13 septembre 2026. Les résultats de recherche anciens décrivent encore V4/V5 : les pages actuelles et le schéma font foi.

- La génération propose V6 standard, V6 Wild et V6 Mini ; les anciennes familles sont encore listées comme obsolètes, pour compatibilité. Leur suppression totale n’est donc pas confirmée par cette documentation.
- Mode simple : description jusqu’à 3 000 caractères. Remix simple : limite distincte de 500 caractères.
- Mode personnalisé : paroles jusqu’à 5 000 caractères, style jusqu’à 1 000 ; durée demandée optionnelle de 10 à 360 secondes entières, y compris upload-cover. Ce n’est pas une garantie de durée exactement obtenue.
- Titre : limite conservatrice de 80 caractères. Le guide dit 80, le schéma V6 dit 100 ; cette divergence doit être clarifiée avant d’accepter davantage.
- Le fournisseur décrit plusieurs variations, sans garantir exactement deux résultats ni une livraison V6 en 20 secondes. Les étapes intermédiaires du callback peuvent être omises.

Sources : [génération](https://docs.sunoapi.org/suno-api/generate-music), [upload-cover](https://docs.sunoapi.org/suno-api/upload-and-cover-audio), [schéma OpenAPI](https://docs.sunoapi.org/suno-api/suno-api.json).

## Fonctions et choix d’intégration

| Fonction | Décision |
| --- | --- |
| Génération V6 / Wild / Mini | Intégration aux sélections, préférences, requêtes et abonnements existants. |
| Durée personnalisée | Paramètre numérique réel ; pas de pseudo-instruction ajoutée aux paroles. |
| Remix d’une source autorisée | Conservation du parcours upload-cover et de l’attribution existants. |
| Paroles assistées / synchronisées | Conservation des endpoints et contrôles d’appartenance existants. |
| MP3, favoris, publication, clip vidéo existant | Conservation ; aucune promesse de nouvelle tarification. |
| Stems | Non ajouté : opération facturée à chaque appel, avec stockage, reprise et prévention des doublons à prévoir. |
| WAV | Non ajouté : conversion asynchrone avec taskId, audioId, callback et gestion des doublons. |
| Extension / remplacement / mashup / sounds | Compatibilité V6 documentée, mais nouveaux parcours asynchrones et coûts non vérifiés ; non exposés comme disponibles. |
| Persona / voix personnalisée | Non ajouté : identité de source, droits, enregistrement de validation et traitement dédié nécessaires. |
| Boost style | Support V6 ambigu : documentation encore explicitement V4.5. |
| Récupération média fournisseur | Nouveau traitement asynchrone, distinct du cache média existant ; non ajouté. |

Les tarifs publics explicites trouvés concernent seulement les stems : 10 crédits fournisseur pour voix/instrumental, 50 pour la séparation multipistes, 20 pour un instrument ciblé. Ces unités ne sont pas les crédits Synaura et ne justifient pas une conversion automatique. [Documentation stems](https://docs.sunoapi.org/suno-api/separate-vocals-from-music).

Autres contrats : [WAV](https://docs.sunoapi.org/suno-api/convert-to-wav-format), [extension](https://docs.sunoapi.org/suno-api/extend-music), [remplacement](https://docs.sunoapi.org/suno-api/replace-section), [sounds](https://docs.sunoapi.org/suno-api/generate-sounds), [voix](https://docs.sunoapi.org/suno-api/suno-voice-generate).

## Préservation et réserves

- Le chantier commence sur un espace de travail déjà très modifié par la refonte locale. Les sources touchées sont copiées avant intervention dans `artifacts/suno-v6/before/`. Aucun nettoyage ou revert des autres changements.
- Pas de migration DB : les modèles sont déjà stockés en texte libre. Les anciens morceaux, leurs modèles, leurs médias et les jobs terminés ne doivent jamais être réétiquetés V6.
- Normalisation uniquement des demandes nouvelles : formulaire restauré, réutilisation, requête en attente ou réessayée avant son nouvel envoi.
- L’ancienne route `/api/ai/generate` n’a aucun appelant dans l’interface actuelle ; elle n’est pas utilisée pour cette intégration. Son ancien contrat de quotas reste une dette séparée, pas un chemin alternatif V6.
- Le débit est atomique, mais il n’existe pas de réservation liée au job. Un timeout fournisseur peut cacher une acceptation réelle : aucune garantie de remboursement asynchrone exactement une fois n’est revendiquée.
- La course préexistante entre callback précoce et insertion du job, ainsi que le cache d’un flux provisoire, nécessitent un chantier de fiabilité dédié ; pas de migration opportuniste ici.
- Tarifs réels V6/Wild/Mini du compte fournisseur à vérifier avant déploiement. Aucune génération facturée exécutée sans accord explicite.

## Validation

Candidate locale vérifiée :

- Suite complète : **655/655 PASS**, aucun test ignoré.
- TypeScript : **PASS** ; build Next production : **PASS**.
- `git diff --check` : **PASS** ; index vide ; aucun commit, push ou déploiement.
- Scan ciblé de 33 fichiers : aucun secret configuré ni motif de clé privée/connexion trouvé. Ceci concerne le périmètre V6, pas une certification de tous les fichiers historiques du dépôt.
- Contrôles navigateur connecté sur le compte Free : V6 Mini sélectionné ; V6 et Wild verrouillés ; anciens morceaux V4.5 toujours présents ; crédit affiché inchangé à 38.
- Générateur vérifié aux largeurs CSS réelles 1440 × 900 et 390 × 844 : pas de débordement horizontal, réglage de durée clavier fonctionnel, footer de génération accessible dans la feuille mobile. Le zoom préexistant du navigateur est conservé ; les dimensions ont été mesurées dans la page, pas déduites de la taille bitmap.
- Captures locales : `artifacts/suno-v6/captures/`. Émulation de dimensions uniquement : téléphone/clavier OS réel non testé.
- Appel fournisseur facturé : **NON EXÉCUTÉ**. Modèles payants, refus, remboursement et réponses sont couverts par des tests simulés, pas par un abonnement E2E modifié en production.

Les anciens tests de refonte imposaient l’identité complète des contrôles V4/V5. Leur empreinte d’origine est conservée : seules 47 zones V6 nommées et vérifiées par empreinte sont projetées vers leur forme antérieure dans le test. Les fonctions de lecture, téléchargement, publication et suppression sont comparées directement aux sources pré-V6. Des tests de mutation vérifient que la protection rejette un changement de requête ou de lecture. Aucun snapshot antérieur n’a été réécrit.

## Corrections de fonctionnement incluses

- Séparation stricte du texte chanté et des réglages ; durée numérique au lieu d’instructions cachées.
- Validation avant débit, et avant envoi côté formulaire ; titre requis clairement indiqué en sur-mesure.
- Normalisation des anciens choix uniquement pour les créations nouvelles ; état d’abonnement chargé avant de réviser une préférence Studio payante.
- Suppression des tags ajoutés en doublon par les puces, validation du texte final complet.
- Réutiliser un morceau quitte le mode remix précédent ; choisir une autre source efface ses anciennes paroles et sa référence de contexte.
- Filtres de bibliothèque effectivement appliqués au rendu, avec conservation des familles historiques.
- Une seule prise en charge d’Espace dans le Studio ; Ctrl/Cmd+K ne déclenche pas la lecture et les contrôles natifs gardent leurs touches.
- Erreurs serveur et ajustement de modèle visibles ; jobs en file attribués au modèle réellement accepté ; garde contre le double envoi immédiat d’une même entrée.

Résultats détaillés : `artifacts/suno-v6/tests.log`, `types.json`, `build.json`, `review.json`. Aperçu connecté relancé sur `http://127.0.0.1:3000`. La production reste inchangée. La mise en service définitive reste conditionnée à la vérification tarifaire fournisseur et à une génération réelle autorisée.
