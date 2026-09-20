# Studio IA unifié — candidate locale

## Intention

Une seule destination `/studio`. Description, paroles et remix audio sont trois modes du même formulaire, avec la collection et les outils de chaque morceau sur place. Les anciennes adresses `/ai-generator`, `/ai-library`, `/studio/library` redirigent vers cet espace ; les paramètres de source, challenge et retour Live sont conservés par Next.

PC : création et collection côte à côte. Mobile : vues Créer / Mes morceaux, état du formulaire conservé, un seul défilement de page. Les réglages et les détails ne sont affichés qu’à la demande.

## Fonctions raccordées

- Génération et suivi existants, erreur fournisseur visible, coût de 12 crédits affiché, verrou synchrone contre le double clic.
- Modèles du contrat existant : V6 Mini gratuit ; V6 et V6 Wild dès l’abonnement. Prix et droits serveur inchangés.
- Description, titre, style, paroles assistées, instrumental, durée demandée, fidélité style/audio, liberté créative, voix, exclusions.
- Import et confirmation audio existants, annulation, crédit de la source, transformation et visibilité de la consigne de remix.
- Collection réelle, recherche, tri, favoris, publications, corbeille, dossiers.
- Lecture par AudioCore existant, téléchargement, partage, réutilisation, remix, paroles synchronisées, droits de remix et publication confirmée.
- Vidéo de couverture : confirmation explicite et coût existant de 100 crédits affiché avant l’action. Aucun changement de tarif.
- Les anciens liens de lecture expirés restent éligibles au mécanisme existant de réhydratation.

Pas de nouveau modèle fournisseur, endpoint, contrat DB, moteur audio ou système de paiement. Les anciens renderers sont conservés dans les sources pour le moment, mais ne constituent plus des destinations utilisateur distinctes. Cette passe n’ajoute ni DAW multipiste ni montage audio ni outils fournisseur fictifs.

## Contrôles

- Suite : 676 tests PASS ; TypeScript PASS ; build production PASS ; `git diff --check` PASS. Scan des nouveaux fichiers : aucun motif de secret détecté.
- Anciennes empreintes de comportement conservées. Les seules projections nouvelles concernent l’adaptateur de présentation exact et l’habillage du laboratoire local. Les handlers audio / visibilité / favoris / corbeille restent contrôlés.
- PC 1440 et mobile 390 × 844, contrôle supplémentaire à 320 px : pas de débordement horizontal observé.
- Contrôles UI sur fixture : idées de départ, modes, paroles, réglages, recherche, filtres, formulaire vide/non vide, V6 Mini gratuit, crédits insuffisants, progression, erreur et état vide.
- Dialogue : publication nécessite confirmation ; annulation possible ; restitution du focus au bouton d’origine vérifiée.
- Smoke local avec `next start` : `/studio` anonyme redirige vers la connexion ; les trois anciennes adresses renvoient 307 vers `/studio` avec paramètres de source, retour Live, piste et vue bibliothèque conservés ; `/dev/studio` renvoie 404.
- Safe area et réduction des animations prévues dans les styles. Clavier OS réel et lecteur d’écran réel non testés.
- Les captures sont sous `artifacts/unified-studio/` et utilisent explicitement des données de démonstration.

## Réserve de validation connectée

Le 19 septembre 2026, SSH vers `192.168.1.43:22` expire depuis cette machine. Le tunnel PostgreSQL habituel ne peut pas être établi ; aucune URL DB n’a été ajoutée aux fichiers d’environnement. Le parcours connecté, une génération fournisseur réelle, l’import, le téléchargement et les mutations sur des données réelles ne sont donc PAS validés pour cette candidate.

Le laboratoire `/dev/studio` est explicitement marqué démonstration, sans appels fournisseur/DB ni consommation de crédit. Il renvoie 404 dans un build production. Son exemption d’onboarding est limitée à cette route exacte, hors production uniquement. Ce n’est pas un contournement d’authentification du vrai `/studio`.

La candidate a été préparée sans commit, push ou déploiement. Le 20 septembre 2026, l’utilisateur autorise sa livraison avec la présentation optionnelle (voir `presentation-entry-experience.md`). SSH est à nouveau accessible et le préflight canonique passe. Les réserves de tests connectés ci-dessus ne sont pas levées par ce seul contrôle serveur. Les modifications utilisateur préexistantes, notamment natives et anciens rapports, restent hors livraison et intactes.
