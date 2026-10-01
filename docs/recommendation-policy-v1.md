# Recommandations Synaura — politique équilibrée v1

Date : 27 septembre 2026. **Candidate locale, non commitée, non déployée.**

Demande : repenser le fonctionnement des algorithmes produit, dans la continuité de la recherche V2. Direction confirmée : goûts personnels, nouveautés et petits artistes. Il s'agit des recommandations et classements musicaux/sociaux, pas d'une réécriture des calculs de facturation, modération ou sécurité.

## Fonctionnement

`lib/recommendation/policy.ts` porte la politique `balanced-v1`, utilisée par le moteur `discovery-v6` et les adaptateurs concernés. Les scores restent spécifiques aux sons, posts et clips : on ne compare pas directement des scores de formats différents.

| Intention | Comportement de la candidate |
| --- | --- |
| Pour toi, goûts connus | Cycle cible de 20 créneaux : 8 affinité, 6 nouveautés, 6 créateurs peu exposés. |
| Nouveau visiteur, peu de signaux | Cycle de 10 créneaux : 4 nouveautés, 4 peu exposés, 1 qualité, 1 catalogue. Pas d'affinité personnelle inventée. |
| Nouveautés explicites | Chronologie conservée. Les exclusions d'artistes s'appliquent aussi avant ce tri. |
| Tendances / populaire | Stratégies existantes conservées, métriques normalisées, diversité et exclusions communes. |
| Ambiances | Même pool public stratifié que le moteur principal, puis correspondance de genres/métadonnées et classement. L'ambiance IA reste IA seule ; les autres restent classiques. |
| Radar | Score métier existant conservé ; artistes masqués exclus et zéros statistiques conservés. |
| Posts | Fraîcheur, affinité et engagement plafonné ; aversion, visibilité, artistes masqués, doublons et diversité pris en compte. |
| Clips | Source publique, clip publié et vidéo obligatoire ; exclusions du créateur et de l'artiste source ; pénalité de skip source et diversité créateur/source sur toute la sélection. |
| Flux historique sons/posts | Trois sons puis un post tant que les deux sources sont disponibles. Pas de boucle bloquée lorsque l'une est épuisée. Ce n'est pas le mélange final de tous les formats dans chaque client Live. |
| Titres proches / suggestions client | Diversité partagée, dédoublonnage, popularité plafonnée. Les relations album/playlist/genre restent pertinentes. La queue explicite de l'utilisateur reste prioritaire. |
| Recherche | La candidate V2 précédente conserve la priorité au titre exact et à l'intention explicite ; aucun quota de découverte imposé à une recherche exacte. |

Les créneaux 40/30/30 sont une **cible**, pas une garantie de quota sur tous les catalogues. Un titre peut satisfaire plusieurs critères mais occupe un seul créneau. Les contraintes de diversité sont relâchées si le pool est trop pauvre ; les exclusions de visibilité/artistes ne le sont pas. Un pool vide ne produit aucun faux contenu.

« Peu exposé » est une approximation : moins de 500 lectures dans la métrique disponible et moins de 500 abonnés au créateur, avec un score émergent suffisant pour le créneau concerné. Ce n'est pas une mesure de carrière ou de qualité artistique. Des métriques absentes diminuent la fiabilité de cette approximation : vérifier leur couverture avant publication.

## Garde-fous et corrections

- Diversité glissante : éviter un créateur consécutif et plus de deux présences dans les huit derniers éléments lorsque des alternatives sont disponibles. Les titres conservent aussi leurs protections genre/IA existantes.
- Les artistes masqués sont écartés des classements concernés, y compris branches chronologiques, Radar, mobile natif et clips-source. Cela ne certifie pas toutes les surfaces du catalogue ni les autres systèmes de blocage.
- Les préférences locales sont isolées par compte ; déconnexion/changement de compte et stockage invalide ne réutilisent plus les goûts du compte précédent.
- Le helper client ne transforme une écoute en préférence positive qu'après 30 secondes ou la moitié d'un morceau court. Son appel dépend du consommateur : ceci n'est pas une refonte de la collecte réelle des événements AudioCore. Les protections et plafonds serveur de `signals.ts` restent inchangés.
- Les promotions existantes sont préservées, avec bonus organique plafonné à 1,2 et raison `promotion` / « Mis en avant ». Le filtre dédié boosté reste distinct. Ni prix ni droits commerciaux modifiés.
- Correction du défaut `Number(null)` qui limitait certaines réponses sans paramètre à un seul résultat ; pagination bornée pour valeurs absentes, invalides, négatives et non finies.
- Les endpoints `recommendations/feed` et `recommendations/mixed` tirent l'identité exclusivement de la session authentifiée, plus d'un `userId` arbitraire de l'URL.
- Le flux mixte consomme toujours un élément par itération : l'ancien mélange pouvait boucler indéfiniment avec des posts restants et plus de sons.
- Pool général clips fixe à 240 entre pages ; `hasMore` calculé après exclusions. Listings propriétaire/profil/source et création de clip inchangés.
- Les zéros d'écoutes/likes sur 30 jours ne sont plus remplacés par les totaux historiques. L'affichage des totaux historiques reste disponible, séparé du score récent.
- Sélection du meilleur candidat en parcours linéaire et mise en mémoire du genre normalisé pendant un classement : évite tris/calculs répétés sans introduire un second cache utilisateur.

## Périmètre des fichiers

- Politique et moteur : `lib/recommendation/{policy,engine,clips,candidates,types,reasonLabels,serverFeed}.ts`.
- Adaptateurs : `app/api/ranking/feed`, `app/api/recommendations/{feed,mixed}`, `app/api/discover`, `app/api/discover/{radar,moods}`, `app/api/mobile/discover`, `app/api/music-clips`.
- Suggestions : `lib/discoverData.ts`, `lib/relatedTracks.ts`, `hooks/useAudioRecommendations.ts`.
- Validation : `tests/recommendation-policy.test.mjs`, `tests/helpers/recommendation-fixtures.mjs`, `scripts/evaluate-recommendations.mjs` ; exemptions ciblées du gel V6 dans `tests/suno-v6-models.test.mjs`, remplacées par des tests exécutables des handlers concernés.

AudioCore, lecteur, modèles DB, migrations, infrastructure, endpoints d'écriture et mise en page ne sont pas modifiés par ce chantier. Les changements antérieurs recherche, abonnements, communauté et natifs restent en place, non stagés. L'ancien moteur non consommé `lib/recommendationEngine.ts` n'est pas supprimé ni réécrit.

## Validation locale

- **889 tests PASS**, dont 24 nouveaux tests de politique, handlers réels compilés avec dépendances contrôlées et hook client isolé. Les tests existants recherche, audio, sécurité, DB contractuelle, related-tracks et recommandation sont inclus.
- TypeScript : PASS.
- Build production local : **PASS**, 100 pages statiques générées. Avertissements connus : données Browserslist anciennes et limite de génération statique du runtime edge ; aucune dépendance mise à jour pour les masquer.
- `git diff --check` : PASS. Scan ciblé de motifs de secrets sur les fichiers de ce chantier : aucune correspondance détectée (pas une certification exhaustive du dépôt). Index Git vide, aucun fichier stagé.
- Scénarios : démarrage froid/chaud, quota avec pool suffisant, déterminisme, catalogue vide/rare, dédoublonnage, artistes masqués, sources privées, données non finies, promotion, profondeur de diversité, 256 combinaisons de pools sons/posts, identité authentifiée, limites, ambiances, Radar/natif, pagination clips, isolation entre comptes, queue explicite et qualification d'écoute du helper.
- Les tests de handlers utilisent des dépendances DB/auth isolées : **ce ne sont pas des requêtes PostgreSQL réelles ni un smoke navigateur connecté**.
- Les contrats V6/audio/autres endpoints non concernés restent contrôlés. Aucun test global n'est désactivé.

### Comparaison synthétique avant/après

Reproduction : `node scripts/evaluate-recommendations.mjs`.
Résultat : `artifacts/recommendation-policy/offline-comparison.json`.
Avant : code réel à `ed8287dcd1cfb6e1c344a74dee7bfb4cf60ba130`. Après : candidate locale. Horloge et seed fixes ; un warm-up, puis vingt classements complets pour chaque moteur/scénario. Les vingt premiers éléments servent aux mesures de composition, pas à borner le travail de classement.

| Jeu synthétique | p50 avant → après | p95 avant → après | max avant → après |
| --- | --- | --- | --- |
| Nouveau visiteur, 90 candidats | 89,42 → 19,29 ms | 123,74 → 40,40 ms | 156,94 → 71,61 ms |
| Goûts connus, 90 candidats | 57,59 → 15,37 ms | 91,90 → 19,39 ms | 95,13 → 19,82 ms |
| Goûts connus, 600 candidats | 1734,47 → 184,92 ms | 2060,44 → 269,25 ms | 2119,65 → 272,28 ms |

Les scénarios à goûts connus passent de 7 affinités / 3 nouveautés / 5 émergents / 5 autres créneaux à 8 / 6 / 6. À froid : 8 nouveautés, 8 émergents, 2 qualité, 2 catalogue sur vingt éléments. Avant et après : vingt titres et vingt artistes distincts sur ces fixtures.

Mesure indicative sur PC local, moteur transpilé dans un contexte VM, pendant d'autres travaux de compilation : **pas un benchmark isolé, pas une latence API, pas une promesse de vitesse en production**. Les fixtures fournissent intentionnellement chaque segment ; elles ne prouvent ni la qualité musicale ni la représentativité du catalogue réel. Une mesure répétée et isolée reste nécessaire avant tout engagement de performance.

## Réserves avant publication

1. Le PC est hors du réseau privé du serveur, comme confirmé par l'utilisateur. Pas de nouvelles tentatives d'ouverture réseau ou de modification d'infrastructure. Smoke connecté et pertinence sur vraies données non réalisés ici.
2. Les pools restent bornés (récents, populaires, catalogue tournant, qualité, IA). Un meilleur classement ne peut découvrir un artiste absent du pool. La couverture des artistes, genres rares et contenus sans statistiques doit être mesurée avant d'élargir les lectures.
3. Les nouvelles routes Radar/ambiances passent par les signaux communs : leurs lectures et leur coût doivent être mesurés sur PostgreSQL réel. Revue selon les recommandations PostgreSQL : lectures bornées, aucun index inventé sans plan mesuré, aucune migration dans cette candidate.
4. Le cache global public reste à 45 secondes ; aucune nouvelle copie personnalisée partagée. Une suppression ou un changement de visibilité peut rester soumis au délai/invalidation existant : vérifier les parcours réels avant publication.
5. Pagination toujours à offset sur un classement réévalué : pool clips fixe et seed stable ne constituent **pas** un instantané immuable si catalogue/signaux évoluent. Les exclusions clients restent utiles. Instantané de session, renouvellement et déduplication interpages à valider séparément.
6. `signals.ts`, qualification serveur des événements, scopes de sessions anonymes et couverture des statistiques n'ont pas été réécrits. Pas de revendication d'audit complet de sécurité ni d'anti-fraude.
7. `/api/tracks/rediscover`, assemblage final des formats Live et moteur client d'autoplay gardent des spécificités. Il n'y a pas une formule unique appliquée aveuglément à tout le produit ; pas de nouvelle collecte d'événements ni de migration d'historique.
8. Pas de test A/B ni de preuve de satisfaction/rétention. Mesurer diversité, répétitions, skips, écoute volontaire/complétée, couverture et erreurs, pas seulement le temps passé.

### Gate connecté suivant

En lecture seule d'abord : couverture des pools/métriques, requêtes et p50/p95/max réels, comptes sans historique/actifs/artistes masqués, chronologie et filtres explicites, pages successives/exclusions, clips publics avec sources privées absentes, cache après modification de visibilité, recherche exacte, natif, retours Live et continuité audio. Ne publier qu'après ces contrôles et validation utilisateur.

**Décision : candidate locale testée, pas GO production. Aucun commit, push ou déploiement.**
