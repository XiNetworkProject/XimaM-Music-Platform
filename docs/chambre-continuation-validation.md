# Chambre — Live, Découvrir et récompenses

Candidate locale en cours de reprise après le retour utilisateur « ce n’est pas fini ». Ce lot prolonge `chambre-redesign-resumption.md`, sans en effacer les réserves.

## Périmètre

- Live : recomposition du prélude existant, en gardant ses données, callbacks, préférences amont et gestes d’accès au Flow.
- Découvrir : progression éditoriale distincte entre ambiances, nouveautés, pépites, classements, créateurs, collections et communauté. Aucun nouveau classement serveur.
- Récompenses : présentation de l’inventaire et des surfaces d’ouverture, pack et roue. Aucun achat, tirage, inventaire, rang de rareté ou contrat modifié.
- Entrée approuvée, prototype, AudioCore, API et base : protégés. Aucun staging, commit, push ou déploiement.

## Preuves et limites de la revue

Les copies avant ce lot sont dans `artifacts/chambre-continuation/before/`, distinctes des deux passages précédents.

- `/dev/v2?surface=live` : vrai composant Live avec son chargement réel. L’environnement local sans base affiche un échec de chargement ; ne pas le masquer.
- `/dev/v2?surface=prelude` : vrai prélude avec le catalogue public disponible, éventuellement en cache. Les callbacks n’enregistrent qu’un libellé dans le bandeau de revue, sans lecture ni navigation. Cette vue valide la composition, pas AudioCore ni le parcours Live.
- `/dev/v2?surface=discover` : vraies sections avec le même échantillon public répété entre sélections. Les classements et données serveur distinctes ne sont pas validés ici.
- `/dev/v2/rewards` : vrais composants et spécimens visuels explicitement fictifs/non attribués. Aucune requête d’achat ou d’ouverture. La roue utilise son GET naturel de statut ; aucun résultat gagnant n’est simulé comme transaction réussie. Son bouton de tirage est neutralisé par un listener natif en capture installé uniquement pendant le montage du laboratoire, même en session autorisée ; fermeture et autres contrôles restent utilisables. Le vrai handler et son nettoyage sont testés. Cette route réutilise le cadre du laboratoire existant, sans ancienne navigation concurrente.
- Ces pages de laboratoire sont refusées en production. Aucun compte simulé, secret de connexion ou contenu utilisateur modifié.

Android/Gboard réel, NVDA réel, mutations et parcours authentifiés restent non validés. Les preuves réellement exécutées sont consignées ci-dessous.

## Revue navigateur exécutée

- Lecteur desktop 1440×900 et mobile 390×844 : correction d’opacité du passage précédent revue. Lecture volontaire réelle, temps observé 0:04 → 0:21, puis pause et réduction explicites. Ce n’est pas une mesure instrumentée de toutes les mutations AudioCore. Waveform/données DB non certifiées.
- Live peuplé, mêmes dimensions : actions Écouter / Continuer visibles en mobile à y257–305 ; raccourcis vers y764 ; largeur racine 390, sans overflow horizontal. Desktop : actions y662–714. Images de secours revues après correction, zéro image cassée restante dans ce composant.
- Clavier Live : défaut reproduit avant correction (Espace sur Écouter entraînait aussi `is-leaving` et l’action différée Ouvrir le Flow). Après correction, même essai : action Écouter conservée, `is-leaving=false`, aucune entrée différée. Test du handler racine séparé : l’Espace sur le conteneur garde son comportement existant.
- Découvrir : sorties, pépites et populaires revus sur desktop ; sorties et suite sur mobile. Largeur des trois sélections mobile 346 px dans la page de 390 px, sans overflow. Les trois ensembles conservent 18 identités uniques chacun dans cette revue. Ouverture/fermeture de la première suite par Entrée vérifiées. Aucun résultat de réseau ajouté ne découle de cette simple observation : l’absence de nouveau fetch/tri est vérifiée en source et par les tests.
- Récompenses : carte révélée mobile, pack fermé/révélé mobile, pack révélé desktop et roue mobile/desktop capturés. Les animations de révélation utilisent uniquement le spécimen local. Roue : vrai état Indisponible ; mobile, corps 631 px avec 724 px de contenu et footer visible y779–827. Aucun tirage exécuté.
- Pack desktop à un seul résultat : défaut d’étirement ~910 px observé, largeur bornée par CSS et recapture à **220 px**. Deux colonnes mobile inchangées.
- 14 captures dans `artifacts/chambre-continuation/captures/`, galerie `artifacts/chambre-continuation/review.html`. Tailles temporaires du navigateur réinitialisées après revue. Aucun onglet de connexion utilisé.

## Défauts corrigés et périmètre préservé

1. Espace remontant d’un bouton du prélude : garde `target !== currentTarget` seulement ; raccourcis du conteneur conservés.
2. Images cassées du prélude : composant de fallback déjà existant, sans changement de données ni dissimulation des erreurs réseau.
3. Carte de pack unique trop large sur desktop : largeur CSS bornée seulement.
4. Laboratoire : même cycle de montage de la roue qu’en produit, aucune ancienne barre de navigation concurrente ; verrou de clic du tirage propre au labo, sans mock réseau ni session.

Les modes, états métier, timings de récompenses, probabilités, inventaires, contenus et transports musicaux restent ceux de la candidate. Les tests de préservation gardent leurs comparaisons strictes ; seules exceptions exactes documentées pour les imports de présentation du prélude et sa garde clavier.

## Ce qui n’est toujours pas clôturé

Les parcours connectés de bout en bout, les données/classes de contenu absentes de la revue locale (notamment les listes réelles d’artistes et de collections), les mutations, les achats, la roue gagnante et la continuité globale entre tous les espaces nécessitent un environnement de test autorisé. Les états de focus complets des anciennes modales de récompenses n’ont pas fait l’objet d’une certification clavier/lecteur d’écran. Android/Gboard réel, NVDA réel et zoom navigateur réel 200 % restent non testés dans ce lot. Le reduced motion est contrôlé en source, pas revendiqué comme scénario système réel.

Ce lot est une **candidate de continuation**, pas la clôture de la refonte complète. Aucune nouvelle validation créative utilisateur n’est présumée.

## Gate final local — 13 septembre 2026

- **489 tests PASS**, aucun échec ni skip (`test-suite.log`). Le total inclut des suites source importées par les tests de continuation ; il ne représente pas 489 scénarios navigateur indépendants.
- **Build PASS**, y compris compilation, lint et contrôle de types. Avertissements existants sur Browserslist ancien et génération statique d’une route Edge ; aucune mise à jour de dépendance hors périmètre.
- **Type-check PASS** après build. Le premier essai rencontrait les types Next générés pour l’ancienne adresse temporaire du labo déplacée ; le build les a régénérés. Aucun contournement du contrôle TypeScript.
- **Smoke du build en mode production LOCAL sur 3010 PASS** : `/`, `/create`, `/publish` → 200 ; `/dev/v2` et `/dev/v2/rewards` → 404. Ce n’est ni un déploiement ni une preuve de santé de la production distante.
- Journal de ce smoke local : aucune occurrence de `PG_ERROR`, `QueryError`, relation PostgreSQL introuvable, `TypeError` ou `Unhandled`. Ce constat borné aux routes publiques ne remplace pas une revue de console de tous les parcours privés ; les échecs de données du labo sans base restent explicitement documentés.
- `git diff --check` : **PASS**. Index vide, HEAD `d0ac45379227b4ad86042b6b8eb2156535f1b817` inchangé ; aucun commit/push/tag/déploiement.
- Inventaire : 103 routes, 108 sources modifiées face aux copies du chantier, 356 fichiers protégés. Seule différence protégée : exception `/publish` exactement contrôlée du passage précédent. Entrée validée, prototype, API, base et AudioCore préservés ; aucune différence protégée inattendue.
- Scan heuristique de 135 fichiers recensés : aucune alerte de secret. Ne certifie pas les fichiers utilisateur/artifacts historiques hors périmètre.
- Serveur temporaire 3010 arrêté après les smoke tests ; aperçu dev 3000 remis en route, prototype 3100 non arrêté.

Décision : **CONTINUATION LOCALE VÉRIFIÉE — REVUE UTILISATEUR ET VALIDATION CONNECTÉE RESTANTES**. Pas de clôture de la refonte complète.
