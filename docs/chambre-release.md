# Release web — Chambre Sonore et Suno V6

Autorisation de mise en production et de campagne email donnée le 14 septembre 2026.

## Périmètre

- Refonte web accumulée et revue : entrée immersive, navigation, Live, découverte, bibliothèque, création, Studio, compte, abonnements et surfaces sociales/contextuelles.
- Génération V6 : Free = V6 Mini ; tous les abonnements payants = V6, Wild et Mini. Prix et crédits Synaura inchangés.
- Ajustements responsive AI/Studio et correction du scroll imbriqué Live, réactions visuelles ascendantes avec reduced motion.
- Aucune migration, modification de taxonomie Community ou application native.

## Reproductibilité et exclusions

Les sources de référence pré-refonte utilisées par les tests sont exceptionnellement versionnées à leurs chemins `artifacts/*/before/`, ainsi que les deux petits inventaires contractuels nécessaires. Ce sont des fixtures textuelles, pas des sorties de build ni des données utilisateur. Aucun répertoire `artifacts/` n'est ajouté globalement. `.gitattributes` conserve leurs octets et espaces historiques : ces références ne doivent pas être reformattées pour satisfaire un lint. Les sources applicatives restent soumises au contrôle normal des espaces.

Les 12 changements préexistants identifiés dans `synaura-v2-files.md` sont exclus, ainsi que les captures, logs, environnements, clés, archives, caches et fichiers temporaires. Un manifeste local avec empreintes et scan de secrets est conservé dans `artifacts/release-chambre/manifest.json` (non versionné).

## Gates et déploiement

- Suite locale complète : 659/659 PASS, aucun skip ; build production local PASS.
- Réserve de packaging identifiée puis traitée : les empreintes dépendaient des fins de ligne mixtes du checkout Windows. Le contrôle Linux utilise des octets LF ; le compagnon `protected-before-lf.json` est dérivé après vérification des empreintes originales, sans changer le code protégé ni les snapshots. Deux empreintes JSX V6 (sélecteurs modèle/voix) sont canonisées uniquement pour CRLF→LF. Les autres transformations et guards restent inchangés ; aucune référence originale n'est écrasée.
- Production avant bascule : `d0ac45379227b4ad86042b6b8eb2156535f1b817`, service et health OK, disque racine 48 %, 30 Go libres.
- Workflow canonique : branche `migration/freebox-storage`, worktree release, build serveur, bascule atomique, health et rollback automatique. Aucun lancement du script Vercel historique.
- La vérification du checkout isolé, du SHA servi et le smoke après bascule doivent être enregistrés dans le rapport opérateur local avant d'annoncer le succès.
- Fournisseur : lecture du solde et authentification PASS. Une génération privée de test V6 Mini est autorisée ; ne pas prétendre avoir vérifié une génération Wild/standard ni extrapoler son coût.
- NVDA et clavier Android/Gboard réels restent non testés. Cloudinary 401 historiques restent séparés. L'interface continue d'évoluer : aucune prétention de refonte définitivement terminée.

## Campagne

L'opérateur confirme le consentement préalable aux annonces. Les oppositions enregistrées sont néanmoins respectées : 32 profils avec adresse, dont 2 avec emails et annonces désactivés lors du préflight. Aucun envoi avant production saine et contrôle du message.

Un message individuel par adresse dédupliquée, sans divulgation des autres destinataires ; retrait des comptes supprimés/bannis et des oppositions. L'envoi utilise un journal durable anti-doublon hors Git et un moyen clair de désinscription par réponse/email. Un résultat SMTP accepté ne constitue pas une preuve de livraison en boîte de réception.
