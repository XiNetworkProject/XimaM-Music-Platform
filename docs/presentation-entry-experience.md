# Présentation Synaura et entrée dans le compte — candidate locale

## Parcours corrigé après retour utilisateur

L’accueil public `/` et son alias `/landing` conservent **ChamberProduct**, « LE SON PREND CORPS », sa matière, ses chapitres et son lecteur. Aucun remplacement par une landing verticale.

Seul le CTA existant « Découvrir Synaura » reçoit une destination optionnelle : `/landing/presentation`. Le prototype `/dev/chambre`, sans cette option, conserve son comportement précédent.

La présentation est un parcours horizontal de quatre diapos : Bienvenue, Découvrir, Créer, Se rencontrer. Elle s’ouvre aussi depuis « Créer mon compte » dans `/enter` et depuis le lien d’inscription du formulaire de connexion. Flèches, indicateurs et clavier permettent de naviguer ; le défilement horizontal tactile est natif, sans interception du geste. Aucun autoplay. Le lien « Passer la présentation » et le CTA final rejoignent le formulaire existant. `callbackUrl` est filtré puis conservé. La route directe d’inscription reste accessible.

Les contrôles restent fixes. Chaque diapo peut défiler verticalement uniquement si nécessaire sur une petite hauteur ou avec du zoom. Les diapos inactives sont `inert`, les captures sont agrandissables dans le dialogue partagé et le focus est restitué à la fermeture.

## Présentation et authentification

- Nouvel habillage partagé `EntryFrame`, sans changement des handlers de connexion, OAuth, inscription, récupération, validation ou des contrats serveur.
- Dans la page de connexion, seule la destination du lien « Créer un compte » change. Le formulaire d’inscription lui-même est inchangé.
- Aucune création de compte, génération payante, publication, migration ou mutation audio pendant les vérifications.
- Vérifications initiales effectuées sans commit ni déploiement. Publication autorisée par l’utilisateur le 20 septembre 2026 ; contrôles de livraison ci-dessous.

## Captures produit : provenance

- Live : `artifacts/v2-pilot/local-live-1440.png`, capture réelle de l’interface locale et de contenu public.
- Découvrir : `artifacts/v2-pilot/local-discover-1440.png`, capture réelle de l’interface locale et de contenu public.
- Studio : capture navigateur de `/dev/studio`, 19 septembre 2026, interface réelle de la candidate avec données de démonstration. Explicitement étiquetée comme telle dans la présentation ; ce n’est ni un compte utilisateur ni une génération réelle.
- Conversion WebP uniquement, aucun écran inventé ou reconstitué. Chargement différé. Chaque WebP reste inférieur à 180 ko. Images accessibles à l’agrandissement.

## Ambiance discrète dans l’application

Une couche décorative partagée ajoute deux lumières diffuses et un léger suivi du pointeur fin. Pas d’accès à AudioCore, aux données métier ni aux endpoints. Aucun suivi du geste tactile, aucune boucle JavaScript permanente. Écouteurs et frame en attente nettoyés au démontage.

Le bouton Ambiance mémorise le choix local. Préférence initiale compatible avec Aura ; un choix explicite d’Ambiance est indépendant. Le mouvement s’arrête avec `prefers-reduced-motion`, économie de données ou onglet masqué. Les scènes publiques, auth, onboarding, admin et embeds n’empilent pas cette couche. Elle ne capte aucun clic et est masquée derrière un dialogue. L’accueil original garde son propre contrôle de mouvement et sa matière inchangés.

## Vérifications locales

- Type-check PASS.
- Suite complète : **682/682 PASS** ; six tests ciblés couvrent mouvement, préférences, cleanup, captures, route séparée et absence d’effets audio/data.
- Tests historiques conservés : projection des deux fragments exacts du CTA ChamberProduct puis hash de la scène originale ; projection du seul href d’inscription puis empreinte des comportements auth. Aucun remplacement aveugle des hashes historiques.
- `git diff --check` PASS.
- Contrôles navigateur : ancien accueil et son CTA, diapos desktop et 390 × 844, boutons précédent/suivant, navigation clavier, pause, cadre fixe, diapos inactives, agrandissement/fermeture/restauration du focus.
- Connexion → présentation → passer → inscription : `callbackUrl=/studio` conservé.
- Inscription mobile : étape nom → email → retour, valeurs conservées. Aucun envoi final.
- Pas d’erreur console remontée par le navigateur dans le parcours contrôlé.
- Limite : la base locale n’est pas disponible (`DATABASE_URL` absente), donc `/api/auth/count-users` retourne le 500 local préexistant. Connexion réelle, inscription complète et OAuth **non validés de bout en bout**. Aucun faux résultat de succès.
- Pas de validation téléphone physique, clavier OS ou lecteur d’écran réel.
- Compilation production : **PASS**, terminée le 19 septembre 2026 à 21:19:20 UTC (`artifacts/suno-v6/build.json`, exit 0).

Captures de contrôle : `artifacts/entry-experience/`. Les premières images de landing verticale sont des essais abandonnés et ne représentent plus la candidate ; utiliser `slides-*`, `studio-slide-*` et `home-restored`.

## Livraison autorisée — 20 septembre 2026

Périmètre : Studio unifié, présentation horizontale optionnelle, habillage auth et ambiance. Aucun changement natif, de base de données ou de tarification. Aucun envoi de mail ni génération fournisseur. Préflight canonique serveur PASS ; baseline avant bascule `3ffae87e45e64a65d796c8b635afc43596dd59fd`, service actif et disque à 48 %. Déploiement par le workflow existant, avec bascule atomique et rollback sur échec du health check. Le résultat après bascule est consigné séparément dans le rapport de livraison, sans anticiper ici un succès.
