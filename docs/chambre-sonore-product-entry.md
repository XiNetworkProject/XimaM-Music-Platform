# La Chambre Sonore — première tranche produit locale

Date : 13 septembre 2026. Statut : candidate locale pour revue, pas un déploiement ni une refonte complète terminée.

Mise à jour suivante : le récit en cinq chapitres avant l’écoute est décrit dans [chambre-sonore-story.md](chambre-sonore-story.md). Les résultats de build ci-dessous concernent la première tranche, pas automatiquement cette révision narrative.

## Périmètre

- Prototype créativement approuvé conservé : `http://127.0.0.1:3100/`.
- Intégration opt-in : `http://127.0.0.1:3000/dev/chambre` ; route interdite en production, non indexable.
- Entrée immersive puis espace d’écoute : matière cobalt animée, transition au scroll, pochettes, genres disponibles, vrais titres/auteurs, lecteur, file et raccords aux surfaces existantes.
- Liens vers les routes produit existantes. Leur présentation n’est pas convertie à cette nouvelle direction dans cette tranche.
- Aucun commit, staging, push, tag, déploiement, changement DB/API/AudioCore, environnement, infrastructure ou application native.
- Les changements antérieurs, notamment la candidate V2 rejetée et les fichiers utilisateur, restent préservés ; ce document ne les valide pas.

## Implémentation

Nouveaux fichiers : `app/dev/chambre/page.tsx`, `components/chamber/ChamberProduct.tsx`, `ChamberListening.tsx`, `ChamberMaterial.tsx`, `chamber-product.css`, `lib/chamberCatalog.ts`, `public/brand/chambre/membrane-cobalt.png`, `tests/chamber-product.test.mjs`, `tests/chamber-product-chrome.test.mjs` et ce document.

Deux raccords ciblés aux fichiers déjà modifiés avant cette tranche : `lib/routeChrome.ts` et `components/GlobalQueueBubble.tsx`. Ils masquent le chrome et les commandes globales dupliquées seulement sur `/dev/chambre` et ses descendants exacts.

La matière réutilise l’image approuvée, avec shader, mouvement de pointeur et onde au clic/toucher, pause, gestion de visibilité et préférence reduced-motion. Le mouvement lié à la lecture utilise seulement l’état `isPlaying` : ce n’est pas une analyse fréquentielle du signal. Aucun nouvel AudioContext ni élément audio musical. La signature sonore autonome du prototype n’est pas rejouée au-dessus d’un morceau.

L’entrée, le scroll, les genres et la navigation entre pochettes ne lancent aucune lecture. Seul Play peut remplacer la file via le provider existant. Le transport utilise l’horloge AudioCore existante ; queue, Profile Peek, Comments et Actions utilisent leurs hooks canoniques, sans nouvelle logique métier.

La requête catalogue attend l’entrée dans l’écoute et la résolution de session. Clé de cache isolée par viewer, AbortSignal, données fraîches côté client pendant cinq minutes, pas de refetch au focus/reconnexion. Aucune requête par carte inactive. Les tests contrôlent ces contrats source ; ce n’est pas une mesure réseau/performance de production.

## Données et limite locale constatée

Le feed local retourne 18 morceaux authentiques, dont Sacré Charlemagne, I Need You et It’s Tinker Time. Les fichiers audio correspondants ont réellement été lus avec le lecteur partagé.

Attention : les candidats du feed proviennent ici du cache persistant Next (`synaura-discovery-v3-candidates`, revalidation 45 secondes). Les caches inspectés contiennent des données réelles ; aucune fixture n’a été introduite. Le dernier cache observé est daté du 12 septembre 2026 à 22:43 UTC. Un feed HTTP 200 ne prouve donc pas que la base locale est disponible.

Les lectures locales du profil `ximamoff`, de la fiche `track_1760491601042_s256yb7p9`, des commentaires et des détails d’Actions retournent 404/« introuvable ». Le username et l’identifiant transmis sont bien ceux du feed. Les endpoints existants interrogent directement PostgreSQL et convertissent aussi certaines erreurs DB en 404.

`DATABASE_URL` est absente des fichiers d’environnement locaux et du processus de cette tâche (présence seulement contrôlée, aucune valeur sensible affichée). Cette absence explique fortement la différence avec le feed en cache ; l’exception exacte du processus serveur n’est pas confirmée faute de ses logs/environnement. Aucun tunnel vers la production, branchement DB, nettoyage de cache ou correctif backend n’a été entrepris.

Conséquence : raccords UI et continuité audio testés, mais contenu complet Profile/Comments/Actions, parcours authentifiés et mutations **non validés** dans cet environnement. Ne pas présenter cette candidate comme prête à déployer.

## Vérifications

- 124 tests ciblés/régression PASS : 18 nouveaux tests, 14 tests du prototype et 92 tests existants AudioCore/routing/contextes/Profile/Comments/Actions.
- Type-check complet : PASS après correction des déclarations de fonctions dans un bloc et de l’itération Set pour la cible TypeScript du projet.
- Entrée et choix de pochette sans autoplay : observés ; sélectionner I Need You laisse le transport vide jusqu’au clic Play.
- Lecture réelle et horloge qui avance : observées. La file passe naturellement au morceau suivant en fin de lecture.
- Profile Peek ouvert pendant It’s Tinker Time : même identifiant, lecture active, horloge 71 → 72 → 96 secondes. Fermeture puis Comments : même morceau, lecture active à 108 secondes. Pas de mutation audio ajoutée par cette vue.
- Queue : affiche le morceau courant et les 14 suivants attendus après l’avancement naturel, sans changement de lecture à l’ouverture.
- Les messages « introuvable » des surfaces sont traités dans l’interface ; journal navigateur error/warn vide lors de ces vérifications. Cela ne constitue pas une validation des données indisponibles.
- Desktop 1440 × 900 et viewport mobile 390 × 844 : aucun débordement horizontal du conteneur principal ; scroll interne de la page et transport fixe contrôlés visuellement.
- Mobile réel, clavier OS, lecteur d’écran et partage OS natif : NON TESTÉS.
- Mesures FPS/latence de production et audit WCAG complet : non effectués.
- Scan heuristique des huit nouveaux fichiers texte de code/tests : zéro motif de secret détecté. Ce n’est pas un audit des secrets historiques du dépôt.
- Index Git vide ; HEAD inchangé `d0ac45379227b4ad86042b6b8eb2156535f1b817`.

Derniers ajustements de cette tranche : libellé neutre « SYNAURA / » (aucune revendication de curation), bouton Queue maintenu sur le transport mobile, espace réservé au CTA/footer uniquement lorsqu’une piste est déjà chargée. L’entrée sans piste reste inchangée.

Mesures DOM après correction : à 1440 × 900, bas du CTA 678,5 px, footer 690–774 px, haut du lecteur 791,4 px ; à 390 × 844, bas du CTA 625,5 px, footer 656–724 px, haut du lecteur 735,4 px. Aucun chevauchement entre ces contrôles. Queue mobile ouverte avec les 14 suivants attendus, transport toujours en pause à 43 secondes. Pause du décor : classe de pause active et animation de pochette `none`, sans mutation audio. Type-check complet et les 18 tests nouveaux repassent après ces ajustements.

Captures finales dans `artifacts/chambre-product/` : `desktop-entry-active-1440.png`, `desktop-listening-1440.png`, `mobile-entry-active-390.png`, `mobile-listening-390.png`. Captures du navigateur intégré aux viewports CSS indiqués, pas d’un téléphone réel. Les surcharges de viewport ont été retirées après capture. La lecture de test a été arrêtée explicitement.

`git diff --check` : PASS (avertissements habituels LF/CRLF du worktree, aucune erreur de whitespace). Index toujours vide.

Build production local : **PASS**, `npm run build` terminé avec code 0, compilation, lint/type validation et génération de 92 pages statiques complétées. Avertissements non bloquants : données Browserslist anciennes et génération statique désactivée pour une page en runtime edge. Aucune dépendance mise à jour pour cela.

Vérification sous `next start` local : `/dev/chambre` → **404**, asset membrane → **200**. Serveur de vérification arrêté après ces requêtes. Le serveur dev local est relancé sur 3000 pour la revue ; le prototype 3100 reste indépendant. Ce build concerne le worktree complet existant, pas une validation créative des autres modifications V2.

## Préservation de la référence

SHA-256 avant/après identiques :

| Fichier du prototype | SHA-256 |
| --- | --- |
| `index.html` | `4DB43054988182B989548872FB00DF3EF21118D0EFBDADD01D5B694B7E5EF81C` |
| `chamber.css` | `A121B88A4677182207943566189996AC58E197A9D9F2A0F42FC9616D740B8E50` |
| `chamber.js` | `84B8192608C8357429005C41FA3C40EEE1144FFCD79DBF1B42EF989A10F1D37A` |

Copie intégrée de la membrane identique octet par octet : `546894445FA574802A1105BB4A4831033E5620BBD70390A41033F360E2AE2251`.

La référence créative reste le prototype approuvé. La nouvelle tranche d’écoute attend sa propre revue visuelle ; elle ne remplace pas automatiquement la page d’accueil ni la production.
