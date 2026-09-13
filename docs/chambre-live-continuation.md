# Chambre Sonore — continuation Live

Statut : **candidate locale, à revoir dans le parcours réel**. Cette reprise ne clôture pas la refonte complète et ne remplace pas la validation connectée de Live.

## Périmètre réalisé

- `components/home/HomeFlowPrelude.tsx` : le prélude devient un espace d’écoute compact. Pochette réelle indépendante du texte ; morceau/artiste et état de lecture en premier ; commandes Écouter/Pause et Continuer dans Live avant les contenus secondaires.
- `components/home/home-flow-prelude.css` : feuille strictement locale, noir/cobalt/argent issus des tokens existants, petit format de pochette sur mobile, contrôles tactiles, rail horizontal, compositions adaptées aux petites hauteurs et reduced motion. Aucun nouveau grand poster ni moteur d’animation.
- Publications, artistes, morceaux disponibles, compteurs, accès Découvrir/Radar/Studio/Événements, recherche, messages et notifications conservés. La formule éditoriale existante est secondaire, plus un titre de sas marketing.
- Les boutons « J’aime » et partage ouvrent toujours la fiche du morceau : leur nom accessible le précise au lieu de suggérer une mutation directe. « Autre écoute » ne promet plus que le morceau dérivé de la liste sera le prochain élément de la queue.

La copie antérieure au passage est conservée sous `artifacts/chambre-continuation/before/live/`. Une copie supplémentaire, avant les deux corrections observées ci-dessous, est sous `artifacts/chambre-continuation/before/live-observed-fixes/`. Aucun snapshot précédent n’est écrasé.

## Préservation et exceptions exactes

Le code avant rendu est inchangé : props, sélection du morceau courant, filtres de morceaux jouables, publications, compteurs, effets, timers, reduced motion et geste de sortie. Aucune préférence n’est déclarée dans ce composant ; les options et leur logique dans `SynauraScroll` ne sont pas modifiées. Aucun changement aux routes, à AudioCore, aux requêtes, à la queue, à l’authentification ou à l’entrée approuvée.

Imports UI ajoutés, et seulement eux :

- `import './home-flow-prelude.css';`
- `import { SynauraImage } from '@/components/ui/SynauraImage';`

Deux défauts ont été observés en navigateur par la tâche principale pendant cette revue :

1. **Images cassées dans le rail mobile.** Les cinq emplacements d’image utilisent désormais le composant de fallback partagé, sans modifier ce dernier. Les sources réelles restent identiques ; avatars de remplacement en `/default-avatar.svg`, pochettes en `/default-cover.svg`. Les erreurs de sources distantes ne sont pas prétendues corrigées.
2. **Espace sur un bouton ouvrait aussi le Flow.** Le `onKeyDown` du conteneur recevait l’événement remontant d’Écouter et déclenchait une seconde action après 320 ms. Seule ligne comportementale ajoutée : `if (event.target !== event.currentTarget) return;`. Le raccourci du conteneur reste intact ; les boutons gardent leur interaction clavier native. Aucun autre handler ne change.

Le geste vertical existant ouvre le Flow ; il n’a pas été remplacé par un nouveau scroll vertical concurrent. Le rail reste horizontal. Aucun filtre, préférence ou contrôle de SynauraScroll n’a été supprimé.

## Vérifications et limites

`tests/chambre-live-continuation.test.mjs` : **7 tests PASS**.

- Empreinte du code avant rendu issue de la copie antérieure, après retrait des deux imports exacts autorisés.
- Les **22 bindings d’événement** et **10 bindings disabled/key** correspondent à l’AST antérieur, dans le même ordre. L’unique exception est la garde clavier exacte, contrôlée avant comparaison ; aucune exemption générale de handler.
- CSS parse valide, sélecteurs locaux, responsive, focus-visible, safe area et reduced motion.
- Rendus SSR isolés des états fermé, vide, en lecture et en pause ; vrais noms/compteurs des fixtures de test, aucune invocation de callback au rendu. Ces fixtures ne sont ni un compte ni une preuve de données, d’audio ou de mise en page réels.
- Exécution ciblée du handler : Espace remontant d’un enfant = **0 entrée dans le Flow** ; Espace sur le conteneur = **1 entrée**.

Mesure navigateur transmise par la tâche principale, avant les deux correctifs observés : à **390×844**, Écouter et Continuer à **y257–305**, raccourcis à **y764**, aucun overflow horizontal observé. Les recaptures après correction et leur verdict sont à consigner par cette tâche ; cette mesure seule ne valide pas le parcours réel.

La surface de revue peuplée utilise le vrai composant et le catalogue public disponible en cache. Ses callbacks de revue ne commandent pas AudioCore : elle permet de juger la composition, pas de certifier la continuité musicale, la session ni la base locale. Android/Gboard réel et NVDA réel ne sont pas testés dans ce passage.

Aucun navigateur, build, commit, staging, push ou déploiement lancé par ce sous-lot. Les vérifications globales et la revue visuelle restent séparées.
