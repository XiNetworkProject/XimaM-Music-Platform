# Chambre Sonore — reprise après rejet de la livraison

Statut : **REOPENED / INCOMPLET**. L’utilisateur a correctement signalé que le premier passage ne constitue pas une refonte complète. La quantité de fichiers modifiés, les tokens et les tests source ne sont pas des preuves d’aboutissement du produit.

Suite du passage ci-dessous : `docs/chambre-continuation-validation.md` consigne la reprise de Live, Découvrir et des récompenses, les bugs observés et les nouvelles preuves. Les mentions « à faire » de ce compte rendu décrivent son point d’arrêt, pas l’état du lot suivant.

## Manques confirmés

| Passage | Constat initial | Traitement de cette reprise |
|---|---|---|
| Créer | Grand poster avant les intentions ; CTA sous le premier écran mobile | Composition recentrée sur intention et action, matière réservée à sa colonne |
| Publier | Ancienne sidebar/identité autour du nouveau titre | Cadre produit partagé, navigation et retour explicite ; mêmes destinations |
| Navigation des pages produit | Espaces difficiles à retrouver, menus différents | Accès Espaces dans le topbar commun ; réutilise overlay, focus et handoffs existants, aucun préchargement de destinations |
| Composer AI / IDE | États beige/brun restants ; hiérarchie génération/publication contradictoire | Tokens sur les vrais contrôles et libellés corrigés, valeurs internes inchangées |
| Lecteur développé | Halos vert/brun/rose de l’ancienne direction | Composition noire/cobalt/matière ; audio, commandes et gestes conservés |
| Track / Discovery mobile | Play inaccessible au premier écran | Composition mobile spécifique, commandes existantes rapprochées |
| Cloche Notifications | Ancien panneau crème non couvert par la page Activité | Reprise du panneau et de ses états |
| Bibliothèque | Modals portaled non traités ; Play réservé au hover | Surfaces scrollables, safe area, découverte tactile/clavier |
| Messages invité | Écran sans marque ni sortie | Cadre avec retour, garde de connexion conservée |

Une correction en source n’est pas déclarée validée visuellement lorsqu’un compte/base est nécessaire pour la voir. Les preuves de cette reprise sont séparées : `artifacts/chambre-resumption/`.

## Changements techniques strictement bornés

Les copies précédant ce passage sont dans `artifacts/chambre-resumption/before/`, distinctes de celles du premier lot. Aucun fichier utilisateur n’est revert, supprimé ou ajouté à l’index.

Exception de présentation explicite : `lib/routeChrome.ts` reconnaît désormais **uniquement `/publish`** comme surface avec cadre produit. Cela enlève son ancien chrome concurrent. Les autres routes, le mini-player et le padding musical gardent exactement leurs décisions précédentes. Un test exécute l’ancienne version et la candidate sur l’inventaire des routes ; l’inventaire de protection accepte uniquement cette transformation textuelle exacte, après vérification du hash de la copie d’origine. La baseline de protection n’est pas remplacée.

## Réserves qui restent ouvertes

- Live présente encore un prélude/dashboard après l’entrée approuvée : sa recomposition et son parcours peuplé restent à faire. Pas de suppression hâtive des fonctions du prélude.
- Discovery après le premier écran : progression éditoriale et sections à poursuivre, pas seulement des carrousels avec une autre couleur.
- Récompenses Boosters : les étapes roue/ouverture/résultat historiques restent à recomposer, sans toucher aux probabilités ni mutations.
- Continuité visuelle totale de la navigation et des transports entre Chambre, Live, Studio et services : **pas clôturée** par l’ajout du menu Espaces.
- Écrans privés et parcours réels : base locale non configurée, aucune validation connectée inventée. Ne pas utiliser la production comme substitut sans accord.
- Android/Gboard réel et NVDA réel non testés ; revue utilisateur toujours nécessaire.

Ni commit, ni push, ni déploiement. La refonte reste ouverte tant que ces parcours ne sont pas traités et revus.

## Vérifications de la reprise

- Create 390×844 : intentions et CTA visibles, CTA y649–695, aucun overflow ; desktop 1440×900 : CTA y403–451. Captures dédiées.
- Track mobile 390×844 : Play y418–466, entier dans le premier écran, aucun overflow. Vrai composant avec le catalogue public en cache, pas preuve de route DB saine.
- Espaces : ouverture desktop/mobile, focus initial sur le titre, Tab/Shift+Tab bouclent dans l’overlay, Échap restitue le focus, corps mobile défilable sans débordement horizontal. Aucun appel de données ni préchargement des destinations ajouté.
- Lecteur : lecture explicite de Sacré Charlemagne, ouverture mobile/desktop et Aura off/on ; identité conservée, temps observé 0:07 → 1:17. Pause puis réduction explicites en fin d’essai. Pas une mesure instrumentée de toutes les mutations AudioCore.
- Défaut supplémentaire observé : l’animation de fond imposait une opacité .42/.52 et écrasait le décor discret. Ces deux déclarations ont été retirées, transformations/durée inchangées et test de non-régression ajouté. Les captures `player-*-before-opacity-fix.png` montrent le défaut **avant** cette dernière correction ; ne pas les présenter comme rendu final vérifié.
- La dernière revue navigateur a été suspendue lorsque l’utilisateur a commencé à saisir sa connexion dans l’onglet de revue. Aucun champ de connexion n’est utilisé pour les essais. La capture accidentelle de cet écran a été supprimée, exclue de toute galerie et non conservée comme artefact.
- Build de cette reprise non encore relancé : le serveur de développement est laissé disponible pendant l’utilisation de l’aperçu. Le build PASS du premier lot ne valide pas les dernières modifications.

## Gate source final de cette reprise — 13 septembre 2026

- Suite locale complète : **449 tests PASS, 0 échec, 0 ignoré** (`artifacts/chambre-resumption/test-suite.log`). Ce total inclut les suites source importées par certains tests de reprise ; il ne représente pas 449 parcours navigateur indépendants.
- Type-check : **PASS** (`artifacts/chambre-resumption/type-check.log`).
- `git diff --check` : **PASS** ; avertissements de conversion LF/CRLF existants, aucun défaut de whitespace signalé.
- Inventaire : 102 routes, 104 fichiers de présentation différents de leurs copies avant chantier ; 356 fichiers protégés surveillés. Seule différence autorisée : la transformation exacte `/publish` dans `lib/routeChrome.ts`. Aucune différence protégée inattendue.
- Scan heuristique sur les 119 fichiers de source/documentation recensés : aucune alerte de secret. Ce contrôle ne certifie pas les artefacts et modifications utilisateur préexistants hors périmètre.
- Index vide ; HEAD inchangé `d0ac45379227b4ad86042b6b8eb2156535f1b817`. Aucun commit, push, tag ou déploiement.

Décision : **REPRISE LOCALE TESTÉE EN SOURCE, REFONTE TOUJOURS INCOMPLÈTE**. Build actuel, revue du lecteur après la dernière correction et parcours privés restent non validés. Les manques produit énumérés ci-dessus ne sont pas clos par les tests.
