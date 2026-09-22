# Livraison web Live — 22 septembre 2026

Publication de la candidate locale demandée par l'utilisateur, sans nouvelle itération créative.

## Périmètre

Navigation web partagée PC/tablette/mobile, création en surface contextuelle, bibliothèque, Live (ambiance audio-réactive, réactions, filtres, continuité de fin de morceau), clips et suivi de transfert, pochettes animées, pages morceau et pochettes des posts partagés.

Rapports détaillés : `create-library-experience.md`, `create-sheet-experience.md`, `live-experience-redesign.md`, `live-navigation-clips.md`, `track-experience-animated-covers.md`.

Les modifications natives, PLAY_STORE, capacitor, les anciens addenda Phase 4B/Community, `.claude`, captures, archives, caches, environnements et fichiers temporaires sont exclus et conservés localement. Aucun envoi email ni génération IA dans cette livraison.

## Gates et ordre opérationnel

- Candidate locale : 742 tests PASS, TypeScript et build optimisé PASS ; pochettes des vrais posts contrôlées à 1440×900 et 390×844.
- Vérifier le contenu exact exporté depuis l'index, ses dépendances de tests, ses fins de ligne Linux et l'absence de secrets avant commit/push.
- Production initiale : `e6222df8e1aa26da0db88ec3c8a33c3fdd138395`, `current` et `last-successful-sha` concordants, préflight PASS, racine 48 %, environ 30 Go disponibles.
- Migration prévue : `20260921120000_music_clips_four_minutes.sql`, uniquement la contrainte de durée 15–60 → 15–240 secondes. Cinq clips existants, durée maximale 59 secondes ; aucune modification de contenu ou de permission. Runner canonique, transaction et verrou borné ; sauvegarde récente vérifiée et essai isolé avant production. Cette migration n'est pas implicitement exécutée par le déploiement applicatif.
- Le serveur dispose de ffprobe ; Nginx Synaura autorise déjà 500 Mio. Limite applicative clips : 250 Mio.
- Push uniquement sur `migration/freebox-storage` après validation. Déploiement canonique : worktree dédié, build serveur, préflight, bascule atomique, health avec rollback et rétention des releases.
- Contrôler le SHA servi, Live, Track, pochettes, navigation/création/bibliothèque, clips existants, health/logs/disques après bascule. Un build seul ne signifie pas une production validée.

## Réserves conservées

Android/Gboard et NVDA physiques non testés. Les 401 de médias Cloudinary historiques restent une dette séparée. Le son des clips reste le morceau Synaura associé, pas une nouvelle fonction de son original. L'upload n'est pas résilient à la fermeture du navigateur. Ne pas revendiquer un transfert SSD de quatre minutes sans l'avoir réellement exécuté.

Le résultat post-bascule est consigné séparément dans le rapport opérateur local afin de ne pas déclencher un second déploiement uniquement documentaire.
