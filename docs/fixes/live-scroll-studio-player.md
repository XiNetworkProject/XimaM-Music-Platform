# Live transitions and Studio song navigation

Candidate locale du 24 septembre 2026, basée sur `06fcf793`. Aucun commit,
push, déploiement, migration ou changement fournisseur dans ce correctif.

Publication autorisée ensuite le 24 septembre, conjointement à la nouvelle
bibliothèque Découvrir, à la demande explicite de l'utilisateur. Aucun correctif
supplémentaire ni changement natif n'est inclus. Résultat opérateur et SHA servi :
`artifacts/release-discovery-20260924/`.

## Causes et corrections

- Live : un callback de scroll natif déjà programmé pouvait sélectionner une
  ancienne carte pendant une avance automatique. `scrollend` ignorait aussi
  l'animation en cours ; le verrou de 500 ms pouvait expirer trop tôt ou être
  libéré par une transition précédente. Ces sélections relançaient l'autoplay.
- Le scroll programmatique possède désormais une cible jusqu'à son arrivée,
  annule les anciens callbacks et ignore les positions intermédiaires.
  Un nouveau geste tactile reprend la main. Les timers sont nettoyés ; un
  touchend pendant une surface verrouillée ne laisse plus le geste bloqué.
- Un aller-retour avant la première frame annule également l'animation native,
  même si la carte de retour se trouve encore à sa position initiale.
- Studio : le titre/la pochette du mini-lecteur ouvrait l'ancien feed de
  recommandations. Pour une création présente dans le Studio (y compris une
  génération récente), ces entrées ouvrent maintenant sa fiche existante.
  Cette ouverture ne lance ni lecture, ni seek, ni remplacement de queue.
- L'ancien lecteur conserve ses autres usages, mais son écran de chargement
  possède désormais un bouton de fermeture, sans attendre les recommandations.

Pas de changement AudioCore, API, modèle IA, crédits, contenu, design des pages
ou navigation principale. Les modifications préexistantes natives/docs restent
hors périmètre et non staged.

## Vérification

- Tests déterministes exécutant le vrai hook Live : cinq échecs reproduits avant
  correction ; sept scénarios passent après ajout du cas d'inversion immédiate
  (également reproduit avant sa correction).
- Treize tests exécutent les vrais callbacks Studio/mini-lecteur et le rendu du
  chargement : identités `gen-`/`ai-`, morceaux récents, nettoyage des listeners,
  conservation des autres routes, fermeture pendant chargement.
- Suite complète : **762/762 PASS**. Les anciens tests de présentation gardent
  leurs empreintes : seuls les fragments exacts du correctif sont projetés vers
  leur état précédent ; les nouveaux tests vérifient leur comportement réel.
- TypeScript : PASS (rejoué après compilation). Build production local : PASS
  (`next build`, 24/09, 10:40–10:45 UTC). `git diff --check` : PASS. Scan ciblé
  des neuf fichiers de la candidate : aucun motif de secret détecté.
- Navigateur connecté, compte E2E existant, aperçus desktop et mobile 390×844 :
  lecture d'une création privée existante, ouverture depuis le mini-lecteur,
  fiche avec bouton Fermer, fermeture et restitution du focus. Aucun crédit de
  génération consommé, aucune publication ni modification de contenu.
- Live : fin du morceau via son slider, passage de « Cœur caraïbe » à
  « SYNAURA (création de XimaM) », carte suivante stable avec progression à 30 s ;
  suivant/précédent/suivant vers « JE REVENDS LE CHOCOLAT (Remix) ».
- Build final (`next start`) : changements rapides puis « Orange Wave » stable,
  fin de lecture via son slider vers « La danse de la patate - CLAREBOUT »,
  progression observée à 7 s sur la bonne carte.
- Studio sur ce même build : viewport effectif **390×844** (zoom du navigateur
  compensé), fiche ouverte depuis la création privée en lecture, aucun ancien
  lecteur monté, bouton Fermer visible dans le viewport et fermeture effective.
- Focus restitué au mini-lecteur, progression de la création conservée (36 s),
  lecture de test mise en pause puis retour Live vérifié. Aucun nouveau log
  console error/warn après lancement du build final ; les erreurs réseau
  précédentes correspondent à l'arrêt volontaire du serveur dev pour compiler.
- Ces parcours utilisent les données réelles via le lanceur local déjà autorisé.
  Seules les écritures ordinaires du compte de test (lecture/impressions et
  préférences automatiques de l'application) sont possibles.

## Limites

- Pas de téléphone physique, pas de test tactile OS réel. La taille mobile est
  un viewport Chromium, pas une validation Android/iOS.
- Le bug intermittent a été reproduit de façon déterministe dans les callbacks,
  pas au hasard en production. Les parcours navigateur ne remplacent pas un
  essai prolongé sur l'appareil où le problème a été observé.
- Le Studio effectue déjà des appels réservés administrateur (`/api/suno/credits`,
  403 pour le compte E2E). Aucun changement de droits dans ce correctif.
