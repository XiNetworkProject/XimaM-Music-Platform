# Live Experience — bilan final Phase 4B

**Phase 4B.8 validée techniquement ; livraison finale autorisée par l’utilisateur après les gates ciblés.** Point de retour avant livraison : `2af010a8dfb44bd7636f0d3a4d407d852f1bd657` (4B.7). La clôture production et le tag exigent le smoke et la vérification du SHA servi.

## Phases et architecture conservée

| Phase | Résultat établi |
| --- | --- |
| 4B.0 Audit | Inventaire des routes/surfaces/contrats et choix de continuité ; pas un nouveau player |
| 4B.1 Continuity | Snapshot Live spécialisé, association à history, ordre/ancre/filtre/cursors préservés ; TTL 30 min, quatre snapshots maximum |
| 4B.2 Context Surfaces | Contrôleur de pile bornée à trois niveaux ; renderers lazy dans un seul hôte `SynauraOverlay` ; Back dépile avant navigation |
| 4B.3 Profile Peek | Identité publique, follow réel, trois morceaux récents, route Profile autonome ; cache cinq minutes, pas de faux signal Aura |
| 4B.4 Comments/Moments | Entités Track/Post/Clip distinctes, commentaires/réactions/markers réels ; waveform reliée au seul AudioCore |
| 4B.5 Actions | Options, playlists, queue, lyrics, details et share dans les surfaces existantes ; deep links canoniques |
| 4B.6 Polish | Baseline desktop/mobile validée ; encodage AI corrigé sans refonte |
| 4B.7 Handoffs | Origine Live propagée aux espaces Create/AI/Studio/Messages/Notifications/Community/City ; retour sans reset audio |
| 4B.8 Final hardening | Audit Aura, budgets, accessibilité et parcours finaux ; focus trap, cartes inactives et noms accessibles corrigés ; texte File lisible ; aucun effet Aura ajouté |

Sources détaillées : [audit](live-experience-phase4b-audit.md), [continuité](live-continuity-phase4b1.md), [surfaces](context-surfaces-phase4b2.md), [Profile Peek](profile-peek-phase4b3.md), [Comments/Moments](comments-moments-phase4b4.md), [Actions](contextual-actions-phase4b5.md), [polish](desktop-mobile-polish-phase4b6.md), [handoffs](creation-social-handoffs-phase4b7.md), [validation 4B.8](aura-performance-accessibility-phase4b8.md).

## Invariants

AudioCore reste l'unique autorité musicale, séparée des snapshots de navigation. Ouvrir/fermer une surface ne doit envoyer aucun play/pause/load/seek ni reset de queue. Le seek waveform/marker résulte d'une action explicite. Les previews et notes vocales utilisent la coordination secondaire existante, sans second player principal.

Live conserve son préfixe vu et restaure `activeItemId`, filtre, offset et focus. Les workspaces AI, Studio IDE et Messages restent des routes autonomes, jamais importées comme overlays Live. Profile, Track, Library, Search et Discover restent leurs destinations canoniques. Aucun nouveau store, provider, endpoint, modèle DB ou système de feature flags dans 4B.8.

Aura est **l'atmosphère vivante autour d'un son et de la communauté qui l'entoure**, pas une mesure numérique. Les informations sociales restent portées par les auteurs, commentaires, réactions, clusters et timestamps existants. Aucune présence simultanée inventée. Intro V3.2 protégée. La matrice 4B.8 ne justifie pas d'ajouter un nouvel effet.

## Défaut confirmé et correction de candidate

Le test réel Tab/Shift+Tab d'Options a quitté le dialogue vers les notifications. Le trap considérait les menuitems `tabIndex=-1` comme des étapes Tab, alors que le navigateur les saute. La correction filtre les contrôles réellement tabulables/visibles/actifs et traite les départs depuis le titre initial Lyrics. Le parcours clavier Live atteignait aussi les cartes inactives : elles sont maintenant inert/aria-hidden, sans changer la navigation ni AudioCore. Des boutons iconiques Profile/Discover ont reçu leurs noms accessibles ; le texte/icône File utilise le premier plan du thème au lieu d'un texte sombre presque invisible. Aucun nouveau design global ni architecture.

## Performance — avant/après production locale

Build 4B.7 `fL8UOVo5kd-yIy7mxYzpJ`, navigateur jetable, données publiées réelles et ordre de trois tracks fixé uniquement dans le runner. Sans génération, message ou mutation sociale ; writes analytiques interceptés.

- Client Live par somme gzip des chunks : **432 941 octets** ; intersection partagée de toutes les pages : **340 119 octets**. Méthode distincte du First Load arrondi de Next.
- LCP local observé **1 236 ms**, CLS cumulé **0,03135** sur cette navigation contrôlée ; pas des percentiles terrain.
- 30 cycles Peek/Comments/Options : **767 éléments DOM avant/après** ; 14 listeners audio natifs stables ; six intervalles actifs stables ; aucun contenu de surface métier après fermeture.
- Compteurs CDP après warm-up : listeners 695 → 705 puis plateau ; nodes 1195 → 1229 puis plateau. Heap après GC : 7,78 → 8,75 Mo décimaux. Croissance résiduelle à confronter à une session longue, pas une déclaration « aucune fuite ».
- Zéro query métier sur réouvertures chaudes et sur 12 secondes fermées. Pollings Messages/Notifications distingués. Une long task de 55 ms sur la passe, sans répétition systématique observée.
- Six Actions : 20 ouvertures chaudes chacune, zéro pic >750 ms ; p95 stabilisé Options 197,8 ms, Playlist Picker 22,6, Queue 18,9, Lyrics 10,3, Details 23, Share 21,9 ms.

Candidate finale `dvJMVCOhc7_15getnUxtV` : 433 075 octets gzip Live (+134, soit 0,031 %), 340 120 partagés. 30 cycles : DOM 767 stable, audio natif 14 listeners, zéro refetch chaud et zéro surface fantôme. LCP local ponctuel 2 056 ms, CLS 0,03140. Heap après GC warm → fin 10,01 → 11,01 Mo ; les compteurs CDP incluent un frame supplémentaire par rapport au relevé avant, donc le delta absolu n'est pas attribuable au correctif.

20 ouvertures chaudes de chacune des six Actions : **zéro >750 ms**, zéro query inactive/injustifiée. p95 après : Options 202,5 ms, Playlist 28,7, Queue 25,4, Lyrics 26,2, Details 26,6, Share 23,7. Aucun besoin démontré d'optimisation.

Session longue **10 min 15 s**, 33 éléments distincts, 30 cycles, 18 retours Track/AI/Messages : invariants PASS. Heap cycle 10 → fin 13,58 → 10,64 Mo ; nodes/listeners/timers plafonnent puis diminuent. Au plus 11 slides ; zéro surface fantôme. Lecture volontairement pausée pour cette mesure mémoire ; ne pas la présenter comme dix minutes de streaming continu. Les golden journeys vérifient la continuité en lecture séparément. Mesures complètes, limites et budgets dans le [rapport 4B.8](aura-performance-accessibility-phase4b8.md).

## Accessibilité et réserves physiques

Audit UI réel du clavier, sémantique AX/DOM, labels, tabs, zoom natif 200 %, reduced motion et contraste sur le build candidat. L'arbre d'accessibilité et les tests automatisés ne remplacent jamais l'écoute d'un lecteur d'écran. Les petits textes d’accent confirmés sous AA sont corrigés dans la clôture ciblée ci-dessous ; cela ne constitue pas une certification WCAG complète.

Diagnostic interne AudioCore en développement : une instance, 14 listeners natifs, un abonné d'état, deux temporels, mêmes comptes après dix cycles de trois surfaces ; dix secondes de repos pausé sans rerender du provider. Ces données ne sont pas extrapolées comme mesures de performance production.

**NVDA réel non testé** : aucun processus ni installation dans les deux emplacements Windows usuels inspectés. **Android/Gboard réel non testé** : ADB disponible, liste d'appareils vide. Mobile 390×844 signifie émulation desktop, pas téléphone physique. Ces réserves n'annulent pas les autres validations.

Le défaut mobile Notifications « Tout lire » identifié par l’audit reçoit un `aria-label` indépendant du texte desktop masqué, sans changement d’action, de logique ni de layout.

## Bugs externes et limites explicites

- **Community Feedback : GET posts → HTTP 500 préexistant. Statut OPEN, explicitement exclu de 4B.8.** [Correctif séparé](fixes/community-posts-500.md). Ne pas déclarer « toutes les surfaces sont saines ».
- Cloudinary 401 historiques : correctif média séparé, aucun masquage console.
- `/api/suno/credits` 403 : guard administrateur attendu avec le compte E2E non admin.
- Compte E2E sans conversation exploitable : aucun envoi de message/voix pour fabriquer un PASS. Contrat de coordination secondaire couvert par les tests AudioCore ; distinction avec conversation réelle.
- Post n'a pas de replies/likes de commentaires dans son contrat : limitation conservée.
- Pas de génération AI payante, publication Upload/Clip, contenu utilisateur supprimé, faux follow ou faux signal social persistant.
- Failure journey : profil 404, Comments/playlists GET 500 contrôlés, presse-papiers refusé, snapshot expiré, token inconnu, Track 404 et cover fallback PASS, sans écran blanc. Quota playlist réel non provoqué.
- Golden mobile 390×844 complet PASS après correction des sélecteurs du runner (menu compte `<details>` fermé et toasts d'information réellement fermés). Aucun correctif de navigation Create/AI nécessaire.

## Production, rollout et rollback

4B.7 reste déployée et active, disque racine 45 %, environ 32 Go libres. Contrôle read-only pendant cette tâche : RAM hôte 721/1977 MiB utilisée, swap 212/4095 MiB ; ce relevé n'est pas un pic de build. Installation 4B.7 historique 1 min 40,877 s ; build 14 min 26,661 s ; application disponible pendant le build. Aucun tuning système ; le build serveur de livraison utilise exclusivement le workflow canonique.

Après validation utilisateur uniquement : inspecter chaque fichier, scan secrets, commit 4B.8 isolé ; workflow canonique (push/service, worktree, build, préflight, bascule/health/rollback/rétention). Smoke production léger des parcours Live, health, logs, disque et AudioCore, en séparant erreurs historiques et nouvelles. Pas de nouveau système de flags par principe.

Rollback candidat : **4B.7 `2af010a8dfb44bd7636f0d3a4d407d852f1bd657`**. Les releases 4B.6, 4B.5 et la release épinglée sont encore présentes au départ de cette phase. Aucun nettoyage manuel demandé ni effectué.

Tag annoté proposé : `synaura-live-4b-baseline`, uniquement après validation finale et déploiement sain ; il devra pointer sur le SHA effectivement servi par `current`. **Tag non créé.**

## Tests et captures finales

266 tests PASS ; type-check, build et diff-check PASS. Golden + audit desktop final : 57 contrôles PASS ; golden mobile : 33 PASS ; zoom natif 200 % et failure journey PASS. Zéro exception JS nouvelle sur ces parcours ; refus admin et médias historiques explicitement séparés. Aucun test NVDA/Android réel inventé.

Captures représentatives locales : [Live desktop](../artifacts/final-phase4b8/final-desktop/live.png), [Live mobile](../artifacts/final-phase4b8/golden-mobile/live.png), [Profile](../artifacts/final-phase4b8/final-desktop/profile.png), [Track](../artifacts/final-phase4b8/final-desktop/track.png), [Discover](../artifacts/final-phase4b8/final-desktop/discover.png), [Library](../artifacts/final-phase4b8/final-desktop/library.png), [Comments mobile](../artifacts/final-phase4b8/golden-mobile/comments.png), [Moments mobile](../artifacts/final-phase4b8/golden-mobile/moments.png), [Peek](../artifacts/final-phase4b8/final-desktop/profile-peek.png), [Actions](../artifacts/final-phase4b8/final-desktop/actions.png), [Create](../artifacts/final-phase4b8/final-desktop/create.png), [AI](../artifacts/final-phase4b8/final-desktop/ai.png). Ces artifacts restent non staged pour la revue ; choisir explicitement les captures à archiver lors d'une future livraison autorisée.

## Décision

**GO technique sous gates de livraison, avec réserves QA explicitement conservées.** Aucune nouvelle feature Aura ni Phase 4B.9. La validation automatisée ne vaut pas validation physique Android/Gboard ou NVDA.

L’utilisateur autorise un commit isolé, son push et le déploiement canonique ; le tag annoté `synaura-live-4b-baseline` n’est autorisé qu’après production saine et doit pointer exactement sur le commit servi. Les modifications utilisateur/natives restent hors candidate ; aucun changement des contrats API/DB, d'AudioCore, de dépendances ou d'infrastructure. Aucun secret ajouté dans les fichiers de la candidate inspectés. La baseline 4B.7 reste le point de retour réellement servi.

## Clôture ciblée finale — gates pré-livraison PASS

Notifications mobile : nom accessible « Tout lire » confirmé dans AX, sans action réelle sur les notifications ni changement de logique/layout. Accents violets confirmés : mélange 65 % du token accent et du token de texte primaire du thème, sans nouveau token/palette et sans recoloration générale en blanc. Mesures finales **4,61 à 6,85:1** pour un seuil AA de 4,5:1 ; détails et exclusions documentés dans l’addendum 4B.8.

Build `MkYEeSiTGlua0BV-39ylB` PASS ; type-check et **268/268 tests PASS** ; golden/audit mobile **83 PASS**, desktop + zoom natif 200 % **84 PASS**, contrôle des deux textes desktop **7 PASS**. Focus, Tab/Shift+Tab, reduced motion et absence de débordement horizontal confirmés. Captures locales de clôture sous `artifacts/final-phase4b8/closure/`, revues sans nouveau défaut visuel. Diff-check et scan secrets ciblés PASS.

**GO livraison autorisée**, pas une certification WCAG complète. Les rapports versionnés consignent les gates pré-livraison ; les preuves opérationnelles avec SHA et tag seront ajoutées après bascule et pourront rester locales pour éviter une seconde livraison documentaire.

- **Réserves QA : Android/Gboard réel NON TESTÉ ; NVDA réel NON TESTÉ.**
- **Bugs externes OPEN : Community Feedback 500, hors 4B.8 ; Cloudinary historiques 401, correctif séparé.**
- **Aucune nouvelle feature Aura ; aucune Phase 4B.9.**
