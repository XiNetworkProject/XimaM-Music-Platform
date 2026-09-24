# Publication web — lecteurs, Studio, profils et messagerie

Autorisation explicite : « publie toutes les modifs ». Baseline précédente :
`918be1f1c07e2205bafa758b98c194bdf84e2d61`, branche `migration/freebox-storage`.

## Lot

- Lecteur compact et agrandi unifiés, actions accessibles, pochettes réelles,
  queue et AudioCore existants conservés. Détails privés du Studio conservés.
- Studio : poste de création fixe sur ordinateur, tiroir dépliant sur mobile.
- Profils : identité, pochettes, actions propriétaire/visiteur et cinq sections.
- Messagerie : navigation, recherche d'amis, demandes, groupes, personnalisation,
  partage explicite de sons publics, vocaux et gestion des erreurs/brouillons.
- Appels auto-hébergés : signalisation privée, permissions contrôlées, interface
  persistante et activation limitée aux deux comptes expressément approuvés.

Hors publication : Android/Play Store, secrets/environnements, fichiers locaux,
caches, captures/archives de travail non suivies et anciens rapports hors lot.
Toutes ces modifications sont conservées dans le worktree. Aucune migration,
aucune nouvelle taxonomie, aucun message, invitation ou groupe de test créé.

## Validation avant publication

La suite initiale présentait 17 échecs d'assertions historiques : anciennes
positions JSX, ancien nombre d'entrées de navigation, anciens fingerprints
de composants depuis refondus. Les tests ont été adaptés au périmètre réellement
approuvé, sans enlever les invariants des écrans non modifiés. L'empreinte
musicale restante a été calculée depuis le commit précédent, pas la candidate.
Les dépendances historiques restent contrôlées après projection des seuls
nouveaux paquets LiveKit. Résultat final du worktree : **822/822 PASS**, dont les
43 tests ciblés messagerie/appels. TypeScript et `git diff --check` passent.
Le contenu exact de l'index a aussi été exporté séparément : **822/822 PASS**
et TypeScript PASS, sans dépendre des modifications natives laissées hors commit.
Scan des 81 fichiers staged : aucun secret détecté (valeurs confidentielles
locales et signatures de credentials), aucun chemin hors périmètre.

Des tests exécutent les vrais composants du lecteur et du profil : aucun play
à l'ouverture/fermeture, seek explicite, transport existant, fermeture Escape,
pochette réelle et upload réservé au propriétaire. Un défaut clavier trouvé
pendant cette revue a été corrigé : Espace sur `summary` ne déclenche plus le
raccourci global play/pause.

Le build production de prévisualisation a réussi (99 pages statiques), avec
TypeScript valide. Le déploiement canonique reconstruit le commit exact sur
ARM64 avant toute bascule, puis vérifie HTTP/service et revient à l'ancienne
release en cas d'échec. Le journal de déploiement et `last-successful-sha`
constituent la preuve de bascule ; ce document ne prétend pas prédire son succès.

## Pilote vocal privé sur le domaine public

`infra/voice/enable-private-production.mjs` vérifie l'état réel puis crée
`/etc/synaura/voice.env` (root:synaura, 0640) et le seul drop-in
`/etc/systemd/system/synaura.service.d/voice.conf`. Les clés sont lues sur
l'hôte, jamais versionnées ou imprimées. Le fichier d'environnement principal
n'est pas modifié. Le redémarrage est laissé au workflow canonique.

- `SYNAURA_CALLS_ACCESS=private`, UUID résolus pour `test2` et `ximamoff` seulement.
- Namespace distinct de la preview : `production-private` ; pas de mélange de salles.
- Deux participants, un appel simultané, un seul processus Next.js.
- Création implicite des salles désactivée, API LiveKit sur loopback.
- **Aucun verrou de preview sur le site public**, ni droits administrateur côté client.
- Test de disponibilité authentifié sans appel/micro automatique.

Après succès du site public, arrêter seulement le processus de preview privée
et son tunnel, pas le serveur de développement ou le service vocal.

## Réserves explicites

- Voix réelle PC/téléphone, 4G/5G, permissions micro, interruption/reconnexion,
  charge, groupes et repli TURN : restent à valider manuellement.
- TURN UDP disponible ; TURN/TLS 443 non installé, nginx existant conservé.
- NVDA réel et Android/Gboard réel non testés dans ce lot.
- Les invitations nécessitent une session web active ; pas de sonnerie OS,
  pas de réception garantie navigateur fermé, pas d'enregistrement serveur.
- Redémarrage serveur = interruption des appels en cours (registre éphémère).
- Les uploads abandonnés ne sont pas nettoyés à l'aveugle ; dette documentée.
- Les historiques Cloudinary 401 restent un sujet indépendant.

Retour arrière applicatif : release précédente via le workflow existant.
Retour arrière vocal seul : `SYNAURA_CALLS_ENABLED=false` dans le fichier privé,
redémarrage contrôlé du site et fermeture des seules salles de ce namespace.
Ne pas restaurer nginx, NAT, DNS ou l'environnement principal en bloc.
