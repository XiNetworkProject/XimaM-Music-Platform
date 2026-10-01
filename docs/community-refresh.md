# Communauté — fil social musical

Candidate locale du 27 septembre 2026. Aucun commit, push, déploiement ou changement de données.

## Direction

L’accueil `/community` ne se limite plus à quatre clubs : il présente les discussions elles-mêmes, leurs auteurs, les extraits, les sons joints et les réponses. `/community/forum` utilise le même composant, en conservant ses liens et ses paramètres de catégorie/recherche/tri. Les pages de rédaction, de discussion détaillée et de club restent les destinations existantes, sans réécriture de leurs contrats.

- Quatre intentions explicites : demander un avis, chercher une collaboration, proposer un remix, partager une idée IA.
- Fil paginé, recherche différée de 300 ms, tri récent/aimé/discuté et filtres thématiques.
- Auteurs et participants issus des publications reçues ; aucun compteur de présence ni activité inventée.
- Sons joints avec couverture et lecture explicite via AudioCore existant. Aucun nouvel élément audio, aucune lecture à l’ouverture.
- Réactions protégées contre les doubles clics ; erreur distincte d’un fil vide ; partage natif ou copie de lien.
- Accès aux contacts/messages, City, FAQ et posts des créateurs conservés.
- Style isolé, petits mouvements suspendables, `prefers-reduced-motion`, focus clavier, adaptation mobile et défilement de document unique.

## Données et périmètre

Aucune migration ni modification des endpoints Community existants. `question` et `suggestion` restent leurs catégories historiques : aucune attribution artificielle à Feedback ou Collab. Les clubs peuvent donc être vides alors que le fil général contient des discussions.

Le fil annule les requêtes remplacées et ignore leurs réponses tardives. Un changement de compte vide les résultats personnalisés précédents (réactions et visibilité des sons). La pagination déduplique les identifiants et conserve la page réussie après une erreur.

Les listes publiques exactes `/community` et `/community/forum` sont lisibles sans attendre l’onboarding. Cela ne dispense pas les mutations ou les routes privées de leurs contrôles d’accès existants.

## Revue hors réseau domestique

La base privée n’est pas joignable depuis le réseau actuel. En développement seulement, un échec serveur du chargement normal peut afficher les vraies publications publiques via `/api/dev/community-preview`.

Ce relais est limité à un GET vers l’hôte fixe `https://synaura.fr`, avec paramètres autorisés uniquement, sans cookies ou jetons transmis. Il retourne 404 en production avant toute requête sortante. Il ne relaie aucune écriture. Les erreurs 401/403 ne déclenchent pas ce repli.

L’interface signale cet aperçu en lecture seule et désactive ses réactions. Les discussions, profils des participants et fiches des sons s’ouvrent sur le site publié. Aucun faux post ni compte factice n’est injecté. Les actions de rédaction locales restent dépendantes de l’accès à la base : leur validation connectée complète devra être rejouée sur le réseau approprié.

## Vérifications

- TypeScript : PASS.
- Suite complète : **865 tests PASS**, dont 17 nouveaux tests Community.
- Tests exécutant les véritables utilitaires, hook et handlers avec dépendances isolées : changements rapides A/B/C, changement de compte, annulation, pagination/dédoublonnage, reprise après erreur, absence de requête par carte, lecture exclusivement explicite, like/unlike, verrou anti-double clic et échec sans faux succès.
- Relais de revue : verrou production, GET seul, destination fixe et absence de transfert d’identité testés.
- Contrats historiques Community : conservation de la taxonomie, auteurs résolus en lot, visibilité des sons et authentification des écritures PASS.
- Revue navigateur : vraies discussions affichées ; recherche « feat » retrouve la discussion correspondante ; filtre Avis réellement vide ; retour au fil complet ; contrôle du tri par réponses.
- Captures et contrôle de largeur : ordinateur 1440×960, mobile 390×844 ; contrôle supplémentaire à 320 pixels sans débordement horizontal.
- Revue statique des chaînes sensibles : aucune clé ou credential ajouté. Les occurrences de token dans les tests sont des chaînes factices de non-transfert.
- `git diff --check` : PASS ; avertissements LF/CRLF du workspace seulement.

Limites : pas de nouveau build production, pas de test de publication/réaction réel contre la base privée hors réseau domestique, pas de validation lecteur d’écran ou téléphone physique. L’import d’une icône absente de la version installée a été détecté pendant le développement et remplacé ; le rendu final et le contrôle TypeScript passent. Les journaux du navigateur conservent cet ancien événement de compilation, qui ne représente pas l’état final.

Les anciens tests de présentation figée des deux pages réécrites ont été remplacés par les assertions du nouveau fil et les tests de comportement. Les assertions des autres pages restent conservées.

Captures locales dans `artifacts/community-refresh/` : `desktop-1440.png`, `mobile-390.png`, `mobile-feed-390.png`.

**Statut : candidate locale prête pour revue visuelle. Production inchangée.**
