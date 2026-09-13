# Chambre Sonore — espaces personnels, sociaux et services

Candidate locale de la refonte complète, 13 septembre 2026. Cette note décrit le périmètre personnel/social/services ; elle ne prétend pas que tous les parcours authentifiés ont été rejoués visuellement.

## Direction et limites

La direction approuvée est prolongée par les compositions : noir profond, cobalt et argent issus des tokens communs, typographie sans serif serrée, lignes de séparation, titres courts et hiérarchie forte. Les pages de travail restent parcourables et utilisables ; elles ne forcent pas une diapositive immersive entre chaque action.

Le bloc de styles ajouté dans `components/v2/personal-v2.css` est limité à `.synaura-chambre`. Les classes existantes `.v2-personal` et leurs variantes sont conservées. Aucun fichier de l’entrée approuvée `components/chamber/` ni du prototype `prototypes/chambre-sonore/` n’est modifié par ce lot.

L’intégration des tokens, cadres partagés, navigation et `EntryFrame` appartient au lot central. Ce lot ne modifie ni `PersonalRouteFrame`, ni `ServiceFrame`, ni les primitives partagées.

## Couverture des compositions

| Espace / fichiers | Présentation de la candidate | Fonctions et états conservés |
| --- | --- | --- |
| `app/library/LibraryClient.tsx` | Titre et outils sur toute la largeur, recherche/collections/reprise réunies, surface de collection dégagée, actions de détail qui se replient sur mobile. | Playlists, favoris, historique, hors-ligne, file, tri/genres, grille/liste, création/édition/suppression de dossier, public/privé, lecture explicite et gestion des téléchargements. |
| `app/search/page.tsx` | Champ de recherche principal, filtres qui se replient, groupes de résultats distincts ; grille desktop, colonne mobile. | Historique local de recherche, suppression des recherches récentes, suggestions, sons/posts/profils/playlists, requêtes annulables, Profile Peek et Track Actions existants. |
| `app/messages/page.tsx` | Titre transversal puis index compact et liste de conversations généreuse ; navigation mobile accessible sans défilement horizontal imposé. | Discussions, demandes envoyées/reçues, amis, groupes, actualisation, recherche, états de chargement et listes vides. |
| `app/messages/[conversationId]/page.tsx` | En-tête et composer alignés sur le journal, largeur de lecture ajustée ; fond et champs accordés au produit. | Retour d’origine, salons/groupes, messages/vocaux/pièces jointes, réactions, personnalisation existante, blocage, mise en sourdine, archivage, permissions de gestion. Les choix visuels personnalisés de conversation restent respectés. |
| `app/notifications/page.tsx` | En-tête compact, filtres repliables, entrées datées lisibles, commandes au moins 44 px. | « Tout lire » conserve son nom accessible mobile, non lues, catégories, suppression individuelle/globale, pagination et navigation des cibles. |
| `app/community/page.tsx` | Clubs numérotés et surfaces interactives, titre distinctif, derniers posts et auteurs réels ; aucun faux visuel de conversation. | Clubs canoniques, préférences qui priorisent sans masquer, agrégats réels, vraie absence de discussion. |
| `app/community/[club]/page.tsx` | Porte d’entrée de club et liste dédiée. | Filtres, pagination, états vides, identité du club et taxonomie inchangés. |
| `app/community/forum/page.tsx` | Catégories à densité maîtrisée, lecture de liste ; raccourcis et composer existants. | Catégories, tri, recherche, vrai contenu, auteurs, accès protégé aux mutations. |
| `app/community/forum/[id]/page.tsx` | Fil de discussion à largeur maîtrisée et composer lisible. | Post, source musicale, auteur, réponses et mutations existantes. |
| `app/community/forum/new/page.tsx` | Zone de rédaction + contexte latéral, empilés sur mobile. | Choix du type, contenu, sélection de morceau, champs/validations et publication inchangés. |
| `app/community/faq/page.tsx` | Même hiérarchie, recherche et contrôles de taille tactile. | Articles, recherche, réponses et liens d’aide existants. |
| `app/posts/page.tsx`, `app/posts/[id]/page.tsx` | Flux de lecture plus large et titre transversal, détail à largeur maîtrisée. | Composer authentifié, cartes de posts réels, pagination, actualisation, suppression autorisée et surface Comments existante. Aucun contrat replies/likes supplémentaire inventé. |
| `app/settings/SettingsClient.tsx` | Index tactile, formulaires ouverts, contenus importants non enfermés dans des cartes décoratives ; index mobile sur deux colonnes puis une aux très petites largeurs. | Onglets, préférences, identité, compte, notifications, sécurité, options existantes, outils personnels, confirmations destructives. |
| `app/stats/page.tsx` | Mesures comparables, filtres explicites, figures cobalt/argent lisibles, comparaison en pointillé, heatmap dans les tokens existants. | Toutes séries et formules, période, contenu, métrique, qualité insuffisante, estimations explicitement indiquées, audience et funnel existants. Aucun chiffre produit pour l’habillage. |
| `app/subscriptions/page.tsx`, `app/subscriptions/success/page.tsx` | Plan actuel identifié, comparatif et cartes de plans lisibles ; colonne mobile, états actif/recommandé distincts. | Prix/limites depuis `PLANS`, facturation mensuelle/annuelle, achat de crédits, paiement, annulation, passage au gratuit, quotas, alertes et confirmation existants. |
| `app/boosters/BoostersClient.tsx` | Inventaire tactile, hauteur naturelle des cartes, filtres lisibles, commandes d’application agrandies ; barre de navigation non collante sur mobile. | Inventaire, effets/durées, raretés et leur distinction sémantique, boosters actifs/utilisés, missions, historique, packs, quotidien, roue, compteurs réels et application autorisée. |
| `components/city/SynauraCityPage.tsx`, `app/challenges/[id]/page.tsx` | En-tête musical, grille d’événements et présentation de challenge cohérentes. | City/Pulse, votes, battles, événements, participation/récompenses, radar, hall of fame, badges et progression. Aucun vote ni effet persistant n’est créé pour la revue. |
| `app/support/page.tsx`, `app/support/SupportForm.tsx` | Présentation d’aide et formulaire latéral puis empilé ; champs de taille mobile, labels reliés à leurs champs, envoi clairement situé. | Formulaire/endpoint/validations, sélection de sujet, email dévoilé volontairement, ressources, limites de service et avertissement booking existants. |
| `app/legal/page.tsx` et `cgu`, `cgv`, `cookies`, `confidentialite`, `mentions-legales`, `rgpd` | Répertoire de documents et largeur de lecture, titres/espacements améliorés. | Tous mots, liens et informations légales conservés ; aucun conseil ou changement juridique ajouté. |
| `app/download/page.tsx` | Présentation Android typographique, appareil légèrement incliné, captures et informations existantes. | APK, liens, FAQ, instructions et fonctionnalités réelles ; aucun binaire natif changé. |
| `app/partnerships/page.tsx` | Présentation, périmètre et prise de contact séparés clairement. | Éligibilité, exclusions, contacts et liens de publication inchangés. |
| `app/join/[code]/page.tsx` | Invitation en deux zones et encadré d’inscription identifié. | Validation du lien, auteur, code de parrainage, bonus déjà prévu et liens connexion/inscription. |
| `app/reset-password/page.tsx` | Récupération avec code dans un formulaire dédié. | Code, email, nouveau mot de passe et résultat inchangés. |
| `app/auth/layout.tsx`, `signin`, `signup`, `forgot-password`, `reset-password`, `error` | Champs/récupération/erreurs accordés au cadre partagé, titres de récupération, espacement mobile. | Credentials/Google, redirections sûres, callback, limites d’inscription, étapes, validations, parrainage, récupération et messages d’erreur existants. |
| `components/onboarding/OnboardingFlow.tsx` | Choix dans la direction cobalt, compositions des étapes et typographie cohérentes. | Univers/intentions complets, retour, modification, passage facultatif, enregistrement et destination existants. |

## Conservation et contrôles de source

41 originaux ont été copiés avant édition dans `artifacts/chambre-full-redesign/before/personal/`, en conservant leurs chemins relatifs : 40 fichiers TSX et la feuille de styles. Ces copies comprennent les modifications antérieures non commitées et ne remplacent pas un checkpoint Git.

`tests/chambre-personal-redesign.test.mjs` : **16 tests PASS** dans ce lot.

- Analyse syntaxique des 40 entrées UI et parsing de la feuille de styles.
- Vérifications ciblées des fonctions et contrôles conservés.
- Comparaison avec les originaux de toutes les instructions hors JSX et de toutes les expressions JSX comportementales, y compris les handlers : **identiques**. Les attributs de présentation/accessibilité sont volontairement exclus de cette empreinte.
- Comparaison des textes et destinations des sept pages légales : **identiques**.
- Scope de styles, focus visible, responsive et reduced motion présents.
- Contraste ciblé de trois contrôles Messages : compteur actif, coche de contact sélectionné et arrêt d’un vocal verrouillé. Le fond utilise `--v2-accent-fill` ; le blanc sur `#315fea` atteint **5,31:1**, contre 2,19:1 sur l’accent clair et 1,78:1 sur l’ancien alias coral. Aucun handler, état ou geste d’enregistrement changé. Une assertion vérifie ces trois classes et calcule le contraste du token réel.
- `git diff --check` ciblé : PASS. Les avertissements Windows de normalisation LF/CRLF ne sont pas des erreurs de whitespace.

Les comparaisons aux originaux sont des preuves locales facultatives : elles sont marquées skipped si le dossier d’artifacts n’existe pas. Elles ne justifient aucun résultat E2E.

## Validation visuelle et E2E — limites explicites

La revue de ce sous-lot est une revue de source. Les captures et vérifications du navigateur sont centralisées par l’agent principal, pour éviter des sessions concurrentes. Ce document ne les déclare donc pas PASS par déduction.

À couvrir dans la matrice centrale : desktop/mobile de recherche/Community/support/auth, puis bibliothèque, messages, notifications, compte, statistiques et inventory avec une vraie session et des données autorisées. Les états vides/erreurs/chargement restent présents mais ne remplacent pas une revue avec des données réelles.

La conversation avec clavier Android/Gboard réel, NVDA réel, les achats/annulations, les mutations sociales et les effets de boosters n’ont pas été exercés dans ce sous-lot. Aucun contenu utilisateur n’a été publié, modifié ou supprimé pour valider l’habillage. Le type-check complet et le build sont centralisés, non lancés en parallèle par ce sous-agent.

## Hors périmètre du lot

- Administration, pages météo et routes legacy : non redesignées par ce lot ; les liens existants sont conservés. Les éventuelles modifications de token/frames globales sont gérées et documentées séparément.
- `app/auth/mobile-google/page.tsx`, les interfaces natives, clés, environnements et projets Android/iOS : intacts.
- Contrats DB/API, AudioCore, providers, historique/navigation et Context Surface Controller : intacts.
- Taxonomie historique Community : aucune reclassification ni migration ; sa dette antérieure reste hors périmètre.
- Cloudinary historiques 401 : aucun correctif de stockage implicite.

Aucun staging, commit, push, tag ou déploiement n’a été effectué par ce lot. Les originaux ne sont ni supprimés ni revertés.
