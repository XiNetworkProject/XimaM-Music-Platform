# Appels privés et groupes — préparation de l’auto-hébergement

État au 24 septembre 2026, 21:03 UTC : **infrastructure vocale installée et prévisualisation HTTPS privée disponible pour `ximamoff` et `test2` uniquement. Application publique inchangée, appels publics désactivés ; voix entre appareils encore NON VALIDÉE**.

## Prévisualisation privée PC / téléphone — 24 septembre 2026

L’utilisateur a approuvé ce test privé puis confirmé son compte `@ximamoff`. `test2` est le compte E2E existant du PC. Vérification ciblée en lecture seule avec le rôle applicatif non-superuser : deux UUID distincts, connexion par mot de passe disponible, amitié existante, aucun blocage, une conversation privée existante. Aucun compte, lien d’amitié, message ou conversation créé pour préparer le test. Les contrôles SQL suivent le moindre privilège ; aucun rôle ni schéma changé.

### Isolation et fonctionnement

- Adresse dédiée : **https://voice-test.synaura.fr/messages**. Ajout A `voice-test`, TTL 300, vers la Freebox ; les entrées `preview`, `voice`, `turn`, le site et les mails sont préservés. Pas de nouvelle redirection NAT.
- Certificat Let's Encrypt distinct `synaura-voice-test`, expiration le 23 décembre 2026. Vhost additionnel `/etc/nginx/sites-available/synaura-voice-test`, webroot ACME existant, hook de renouvellement limité à ce lineage.
- Build Next production local dans `.next-voice-preview` (ignoré), serveur loopback 3331 et tunnel SSH inverse **127.0.0.1:13331** côté serveur. Aucun serveur de développement exposé. Le serveur dev 3000 et son `.next` restent utilisables ; les fichiers `tsconfig.json` et `next-env.d.ts` n’ont pas changé.
- Lanceur `node scripts/voice-private-preview.mjs` : vérification des pseudos approuvés contre les identités DB, UUID passés uniquement dans l’environnement serveur, secrets chargés par SSH en mémoire, jamais persistés en clair sur le poste. Secret de session privé aléatoire indépendant ; les sessions du site public ne sont pas réutilisées. Identifiant de namespace `phone-test`.
- Accès aux pages et API fermé avant leurs handlers, sauf le flux exact de connexion par email/mot de passe et les ressources visuelles de connexion. Session invalide refusée, aucun simple cookie de présence accepté. Une identité authentifiée hors liste est refusée. Le bouton Google de la page habituelle n’est pas utilisable dans ce preview : utiliser email/mot de passe, sans changement de configuration OAuth publique.
- En complément, l’API d’appels vérifie le compte et **tous** les membres de la conversation. Liste privée vide/invalide = fermé. Mode public possible uniquement par choix explicite, jamais par défaut. Prévisualisation limitée à **2 participants et 1 appel simultané** ; ce n’est pas la limite produit définitive.
- Salles `synaura-voice-private-phone-test-<UUID>`, distinctes des autres instances/public/anciennes salles. Le nettoyage de démarrage ne touche que les salles possédées par ce namespace.
- Nginx fixe l’origine, écrase les en-têtes de proxy, retire les en-têtes de contournement middleware, interdit l’upgrade dev, désactive les logs d’accès et impose `private, no-store` / `noindex`. Aucun appel vocal en URL et aucune clé côté client.
- La prévisualisation dépend du PC allumé et de son tunnel. Arrêt supervisé si le tunnel/app meurt, expiration automatique **8 heures après le démarrage** (vers 07:02, heure de Paris, le 25 septembre pour cette session). Ce lien n’est pas une nouvelle production durable.
- Données réellement connectées à la production. Les connexions normales actualisent le dernier accès ; ouvrir la conversation peut actualiser sa lecture. Aucun contenu n’a été envoyé/supprimé, aucun appel ni micro lancé automatiquement.

### Contrôles effectués

- **43/43 tests ciblés PASS** : messagerie, registre/permissions, infrastructure, liste privée, tous les membres, isolation des salles, gate pages/API et défenses du proxy.
- `npm run type-check` **PASS**. `next build` isolé **PASS**, contrôle des types inclus et 99 pages statiques produites ; accès DB de build contraint en lecture seule. `next start` **PASS**.
- Smoke HTTP HTTPS réel : quatre API de données anonymes refusées 401 ; cookie invalide et en-têtes middleware forgés refusés 401 ; inscription bloquée ; redirection de connexion sur le bon hôte ; formulaire 200 ; authentification E2E `test2`, messagerie, conversation existante XimaMOff et `/api/messages/calls` avec `enabled: true` **PASS**. Session propre à ce smoke fermée ; aucun start/join envoyé.
- Dans le navigateur Codex : compte **test2 connecté**, conversation **XimaMOff ouverte**, bouton **« Appeler cette discussion » visible**. Aucun bouton d’appel cliqué, aucun accès micro demandé.
- `git diff --check` PASS, syntaxe scripts/bashes PASS, scan ciblé des sources vocales sans clé privée/provider détectée ; aucun staging, commit, push ou déploiement applicatif canonique. Les changements préexistants hors périmètre sont conservés.
- Après ajout du vhost : empreintes des vhosts Synaura, Weyra et LiveKit identiques ; `current` et `last-successful-sha` restent `918be1f1c07e2205bafa758b98c194bdf84e2d61`. PID Synaura **126639**, démarrage **12:02:16 UTC**, inchangés. Health canonique `Result=success`, `ExecMainStatus=0` ; nginx valide ; service voix actif, **0 redémarrage**, environ **48 Mio** ; racine **49 %**. Aucun warning du service vocal dans la fenêtre de contrôle.

### Test manuel restant

1. PC : onglet privé connecté à `test2`, casque conseillé.
2. Téléphone : ouvrir le lien HTTPS, connexion email/mot de passe de `@ximamoff`, puis la conversation `test2`. Garder l’onglet visible.
3. Lancer volontairement l’appel et autoriser les deux micros. Vérifier voix dans les deux sens, mute/unmute, raccrochage, arrêt du micro et absence de reprise automatique de la musique.
4. Refaire avec le téléphone en 4G/5G (Wi-Fi coupé), puis vérifier refus micro et coupure/reprise réseau. Pas de validation WAN déduite du seul accès LAN.

**Réserves** : média réel entre appareils, appels de groupe, TURN authentifié, repli sur réseau UDP bloqué (TURN/TLS non installé), IPv6, arrière-plan mobile et charge. Le résultat Audio Core élargi historique 40/41 reste documenté plus bas ; pas de fausse validation globale. **GO test privé uniquement, pas GO activation publique.**

Retour arrière du preview : arrêter son seul lanceur/tunnel ; le site public ne dépend pas de lui. Pour retirer l’adresse, désactiver uniquement le lien nginx `synaura-voice-test` après contrôle, tester/recharger nginx puis retirer uniquement le DNS A `voice-test` sur demande. Conserver certificat et sauvegarde `/var/backups/synaura-config/voice-private-preview-20260924/` ; ne restaurer aucun dossier nginx global. Ne pas arrêter LiveKit ni modifier les ports du site pour retirer ce seul preview.

## Choix et coût

L’utilisateur demande la solution gratuite : retenir le serveur open source LiveKit auto-hébergé, sans souscription LiveKit Cloud et sans fournisseur de minutes. La licence du serveur est Apache-2.0. Les ressources serveur, la bande passante, l’électricité et l’exploitation restent à la charge de Synaura ; ni capacité illimitée ni coût d’infrastructure nul ne sont promis.

Périmètre : voix dans les conversations privées et de groupe existantes. Pas de serveurs communautaires persistants, téléphonie vers des numéros, caméra, enregistrement d’appels ou transcription dans ce lot. Ne pas transformer les salons `voice_notes` en appels : ce sont toujours des messages enregistrés.

## État hôte vérifié en lecture seule

Contrôle SSH sur `synaura@192.168.1.43`, sans sudo ni installation :

- Architecture ARM64 (`aarch64`), 2 processeurs logiques.
- Mémoire : 1 977 Mio au total, 1 137 Mio disponibles au moment du contrôle ; swap utilisé 208 Mio.
- Racine : 59 Gio, 27 Gio utilisés, 30 Gio disponibles, occupation 48 %.
- `synaura` et `nginx` actifs.
- TCP 443 déjà écouté sur IPv4 et IPv6.
- Aucun listener observé sur les ports candidats 3478, 5349, 7880, 7881, 7882.
- `livekit-server` non trouvé dans le PATH du compte d’audit. Cela ne prouve pas l’absence de tout conteneur ou binaire ailleurs.

Ces mesures hôte ne prouvent ni la capacité sous charge ni la joignabilité depuis Internet. L’architecture historique documentée est une VM Debian derrière la NAT Freebox avec nginx pour le site. Les règles WAN et la zone DNS ont ensuite été inspectées en lecture seule dans les interfaces authentifiées, comme détaillé ci-dessous.

## Préparation réseau avant toute activation

Un simple proxy HTTPS du site ne suffit pas au transport de la voix.

| Flux proposé | Destination | Statut |
| --- | --- | --- |
| Signalisation WSS/TLS | `voice.synaura.fr`, nouveau vhost nginx vers 127.0.0.1:7880 | DNS/certificat installés, HTTPS et upgrade WSS authentifié PASS |
| ICE UDP multiplexé | 7882 UDP vers 192.168.1.43:7882 | Listener et NAT présents ; transport média réel à tester |
| Repli ICE TCP | 7881 TCP vers 192.168.1.43:7881 | Connexion par IP publique depuis le LAN PASS ; WAN indépendant à tester |
| Relais TURN UDP | 3478 UDP vers 192.168.1.43:3478 | Réponse STUN PASS ; allocation/relais authentifié à tester |
| Relais TURN/TLS | Nom `turn.synaura.fr` réservé, certificat obtenu | TLS vocal NON activé ; résolution du partage de 443 et test de réseau contraint toujours requis |

Ne pas exposer directement l’API 7880 au WAN. Ne pas ouvrir la plage UDP 50000–60000 si le multiplexage UDP est retenu. Conserver PostgreSQL et les ports Next.js non publics.

La documentation LiveKit demande une terminaison TURN/TLS adaptée au port 443 pour les réseaux contraints. Le site utilise déjà TCP 443 : ne pas le remplacer, l’arrêter ou ajouter un second listener incompatible. Choisir et revoir séparément la solution de routage L4/TLS ou une adresse dédiée ; un vhost nginx HTTP supplémentaire ne résout pas ce transport. Ne pas acheter un relais externe automatiquement.

À vérifier avant décision d’activation applicative : annonce ICE réellement reçue par les clients, flux média LAN/WAN et 4G/5G, relais authentifié, ainsi que comportement IPv6. L’installation réseau autorisée ensuite est détaillée ci-dessous.

### Audit Freebox OS et Hostinger authentifiés — 24 septembre 2026

Lecture des interfaces dans le navigateur Codex après connexion effectuée par l’utilisateur, sans extraction de session, sans export et sans modification des réglages :

- Freebox OS : connexion Internet active, lien fibre `Up`, IPv4 avec plage attribuée `0–65535` (pas de restriction à un quart de ports).
- Deux redirections manuelles actives : TCP WAN 80 vers LAN 80 et TCP WAN 443 vers LAN 443, destination affichée `synaura-server`. Aucune redirection manuelle dédiée à LiveKit/TURN. DMZ désactivée.
- UPnP IGD actif ; deux redirections automatiques observées, TCP/UDP 6881, sans collision avec les ports vocaux candidats. Aucun réglage UPnP modifié.
- Aucun port candidat 3478, 5349, 7881 ou 7882 observé dans la liste des services entrants de la Freebox. Cette lecture n’est pas un test de joignabilité ni une réservation de ports.
- Zone `synaura.fr` Hostinger accessible : les enregistrements A `@`, `preview` et `media` correspondent à l’IPv4 publique affichée par la Freebox. `www` est un CNAME vers `synaura.fr`, `cdn` pointe vers le CDN existant.
- Aucun enregistrement `voice` ou `turn` dans la zone affichée ; aucun AAAA affiché. Les noms `voice.synaura.fr` et `turn.synaura.fr` restent des propositions, pas des services créés.
- Serveurs de noms confirmés dans la zone : `ns1.dns-parking.com` / `ns2.dns-parking.com`. Les enregistrements de messagerie et de validation du domaine sont laissés intacts.

À l’issue de cet audit seul, aucun DNS, port, certificat, service ni variable de production n’avait été modifié. L’utilisateur a ensuite explicitement autorisé l’installation isolée, les sous-domaines et les ports dédiés, en conservant le routage HTTPS du site et les appels désactivés. Cette autorisation ne vaut pas publication applicative ni bascule de TURN sur le 443 existant.

### Installation autorisée — 24 septembre 2026, à partir de 20:27 UTC

- Binaire officiel LiveKit **1.13.7 Linux ARM64**, empreinte de l’archive vérifiée contre le manifeste officiel et la valeur épinglée `5d167fdf52cf43c0c72972f25325364479f41f854bfef651056eab2504da5de9`.
- Service `synaura-voice.service` actif et enabled, compte dédié `synaura-voice` sans shell ni privilèges. Binaire dans `/opt/synaura-voice/1.13.7/`. Mémoire haute 256 Mio, maximum 384 Mio, swap interdit, CPU plafonné à 75 % d’un cœur, 128 tâches. Ces limites ne sont pas une mesure de capacité.
- Configuration `/etc/synaura-voice/livekit.yaml`, clés aléatoires générées exclusivement sur le serveur dans `/etc/synaura-voice/keys.yaml`, mode 0640 `root:synaura-voice`, répertoire 0750. Aucun secret copié sur le poste, dans Git, dans un argument de processus ou dans les réponses.
- `room.auto_create: false`, 8 participants maximum, absence de remute distant et absence de service d’enregistrement. API liée à `127.0.0.1:7880` uniquement. Aucune redirection de 7880, Next.js ou PostgreSQL.
- DNS A `voice` et `turn` ajoutés, TTL 300, vers l’IPv4 Freebox vérifiée. Les autres entrées, y compris les mails, sont conservées.
- Certificat Let's Encrypt `synaura-voice`, SAN `voice.synaura.fr` et `turn.synaura.fr`, expiration **23 décembre 2026**. Renouvellement webroot via le timer certbot existant, hook propre à ce certificat testant puis rechargeant nginx. Pas de changement de plugin pour les autres certificats.
- Vhost additionnel `/etc/nginx/sites-available/synaura-voice`, sans modification des fichiers Synaura/Weyra existants (SHA-256 identiques avant/après). Les routes publiques vocales sont limitées à `/rtc`, `/rtc/validate`, `/healthz`. Administration, debug, agents et ingress ne sont pas routés. Journal d’accès désactivé sur ce vhost pour ne pas enregistrer les jetons WebSocket en query string.
- Trois règles Freebox ajoutées et relues actives : UDP 7882, TCP 7881, UDP 3478, chacune vers le même port de `synaura-server` (192.168.1.43). Les règles 80/443, la DMZ et UPnP ne changent pas. Aucune plage de ports ouverte.
- TURN intégré **UDP seulement**. `tls_port: 0` : ne pas annoncer faussement du TURN/TLS sur 443. Le code officiel 1.13.7 annonce toujours 443 pour son TURN/TLS intégré, même si son port d’écoute est 5349 ; ouvrir seulement 5349 ne résoudrait donc pas le problème. Le vhost HTTPS `turn` retourne 404 et n’est pas un relais TLS. Aucun AAAA ajouté ; les listeners RTC IPv6 observés restent à auditer avant activation.
- Sauvegarde nginx avant ajout : `/var/backups/synaura-config/voice-stage-one-20260924T202749Z/`. Le staging sans secrets `/home/synaura/voice-stage-20260924/` et l’archive vérifiée `/var/cache/synaura-voice/1.13.7/` sont conservés pour traçabilité ; aucune purge automatique.

**Tests de cette installation :**

- `infra/voice/control-smoke.py` exécuté sur le serveur : 11 contrôles PASS (administration anonyme refusée, jeton participant sans privilèges admin, admin inaccessible via HTTPS public, certificat/health, refus de création implicite, création/liste explicites d’une salle isolée, validation d’un participant microphone, vrai upgrade WSS 101, suppression et absence finale de la salle). Aucune DB ni conversation utilisateur touchée, aucun micro capturé.
- `scripts/voice-network-smoke.mjs` depuis le poste : HTTPS health 200, validation anonyme 401, admin/debug publics 404, TCP 7881 joignable et réponse STUN UDP 3478 via l’adresse publique. Ce chemin depuis le LAN prouve le hairpin NAT, **pas un test WAN indépendant ni un relais TURN authentifié**. Le contrôle externe tenté via l’outil web n’a pas pu accéder aux health checks ; aucune validation externe n’est déduite de cet essai.
- Tests voix/messagerie 21/21 PASS et garde-fous infrastructure 5/5 PASS, TypeScript PASS. Syntaxe bash, unité systemd et nginx validés ; hook de renouvellement exécuté avec le bon lineage, reload nginx réussi. `git diff --check` PASS ; scan ciblé sans secret détecté et index Git vide. Aucun build applicatif ni commit/push/déploiement Next.js dans cette étape infrastructure.
- Service vocal sans redémarrage en boucle ; environ 18 Mio au repos initial, 47 Mio après les smokes. Avertissement LiveKit sur la taille du buffer UDP hôte (425 984 octets versus 5 000 000 suggérés) : réservé à la mesure de charge ; aucun sysctl global modifié.
- Un appel manuel du health script sans l’environnement de son unité a produit un faux échec du profil PostgreSQL. L’unité canonique charge `/etc/synaura/backup.env` ; son exécution avec cet environnement confirme la requête DB, le site, les médias et les disques. PostgreSQL accepte les connexions et l’API publique featured retourne 200. Aucun incident DB attribuable au service vocal observé.
- Production applicative conservée sur `918be1f1c07e2205bafa758b98c194bdf84e2d61`, `current` et `last-successful-sha` alignés ; même PID Synaura 126639 et même démarrage à 12:02:16 UTC, aucun redémarrage. Racine autour de 49 %, SSD 7 %. Aucun flag d’appels activé et aucun environnement applicatif modifié.

**Réserves encore ouvertes :** appel privé/groupe réel entre appareils, transport ICE UDP 7882, repli TURN avec UDP bloqué, réseau cellulaire indépendant, microphone/permissions, compatibilité IPv6, charge et buffer UDP. Installation de première étape terminée, **pas de GO activation applicative**.

## Intégration candidate et contraintes d’activation

- Service vocal séparé du processus Next.js et de PostgreSQL, binaire ARM64 à version et empreinte figées, compte dédié sans privilèges ; première étape installée sur autorisation explicite, limites de ressources à mesurer.
- Secrets hors Git et hors bundle client, permissions restreintes. Pas de clés de démonstration en production.
- Activation désactivée par défaut ; l’absence de service doit laisser la messagerie utilisable sans bouton d’appel trompeur.
- Appartenance à la conversation vérifiée côté serveur ; amitié et blocage pour les appels privés ; règles explicites pour les groupes et les membres bloqués. Ne pas faire confiance à un identifiant de salle fourni par le client.
- État d’appel distinct des messages : invitation, sonnerie, acceptation/refus explicites, expiration, occupation, fin et reconnexion. Ne pas utiliser `typing` ou `recording` comme fausse signalisation d’appel.
- Jeton court limité à une identité et une salle, publication microphone uniquement, aucun droit d’administration ; identité de salle propre à chaque appel. La révocation de jetons n’est pas équivalente entre Cloud et auto-hébergé : recontrôler les accès et traiter retrait/blocage/fin explicitement.
- Micro seulement après geste utilisateur ; arrêt de ses pistes au raccrochage, refus ou démontage ; aucune écoute ni réponse automatique.
- Pause de la musique pendant l’appel via le mécanisme AudioCore existant, sans reconstruire la queue ni lancer une deuxième musique. Reprise explicite après l’appel.
- État et contrôle d’appel persistants pendant la navigation ; retour simple à la conversation, sourdine, participants, sortie, erreurs et refus de permission compréhensibles.
- Pas d’enregistrement serveur ni de transcription. Ne pas annoncer de chiffrement de bout en bout sans l’avoir effectivement intégré et testé.

### État du code

- `lib/voice/callRegistry.ts` : registre éphémère, transitions sérialisées, invitation 45 s, bail client 45 s, durée maximale 2 h, refus et occupation, appels de groupe, fermeture et reprise du nettoyage après erreur fournisseur.
- `lib/voice/server.ts` et `/api/messages/calls` : identité issue de la session, origine de mutation contrôlée, limite de requêtes, JSON borné, requêtes PostgreSQL paramétrées, droits vérifiés côté serveur. Secrets et erreurs fournisseur ne sont jamais renvoyés au client.
- Un seul worker Next.js requis. Aucun ajout de table/migration : un redémarrage du processus interrompt les appels, et l’initialisation ferme les anciennes salles de son namespace exclusivement. Pas d’historique d’appels durable.
- Les droits sont recontrôlés au join, aux heartbeats et par entretien toutes les 15 s. En cas de retrait de membre/blocage ou d’erreur de vérification, la salle entière est fermée. Pas de garantie de révocation instantanée ; une panne du serveur vocal peut retarder sa fermeture. Le client ferme son micro après trois heartbeats en échec.
- Jetons de 30 s, microphone seulement, sans droits d’administration. LiveKit auto-hébergé ne révoque pas tous les jetons déjà émis, et rafraîchit ceux des clients connectés : la sécurité du scénario retrait/fin repose aussi sur la suppression de salle et **`room.auto_create: false` obligatoire**. Le serveur LiveKit doit être dédié à ce namespace, sans autre application capable de recréer ces salles.
- Politique de groupe conservatrice : appel refusé si un blocage existe entre deux membres ; invitation aux membres initiaux, sans ajout automatique de nouveaux membres pendant l’appel. Quitter volontairement permet de rejoindre à nouveau si le groupe continue.
- `VoiceCallProvider` reste au-dessus des routes. Chargement du SDK navigateur uniquement au geste d’appel/acceptation ; micro jamais demandé par le polling. Permission refusée ou connexion tardive annulée : arrêt des pistes. Le lecteur musical conserve sa queue et ne reprend pas automatiquement après raccrochage. L’enregistrement d’un vocal est bloqué pendant un appel sur ce client.
- Invitations dans l’application par polling toutes les 8 s quand le service est activé ; pas de push d’appel natif, de sonnerie OS ni de garantie de réception si le navigateur est fermé ou suspendu. Invitation visuelle, sans sonnerie sonore ajoutée dans cette candidate.
- Limites candidates configurables et bornées : 8 membres par conversation appelable, 4 appels simultanés. Elles protègent la VM sans constituer une mesure de capacité. Appels désactivés par défaut ; aucun compte gratuit/payant n’est privilégié.
- Préparation opératoire dans `infra/voice/`, première étape distante installée après autorisation. Les variables d’activation ne sont pas ajoutées à `.env.local` ni à la production.

### Résultats et réserves

- Tests `voice-calls` et `messaging-experience` : 21/21 PASS (transitions, concurrence, erreurs, accès, configuration et garde-fous de source). Les contrôles d’accès applicatifs suivent le principe du moindre privilège du guide PostgreSQL, sans modifier les rôles DB.
- TypeScript : PASS ; `git diff --check` du périmètre PASS. Rien staged, commité ou déployé.
- Vrai binaire LiveKit Windows 1.13.7, archive SHA-256 vérifiée : service éphémère lancé sur loopback puis arrêté ; création/liste/suppression de salle et vérification de jeton microphone PASS ; accès administrateur avec jeton de participant refusé. Clés aléatoires en mémoire, aucune base consultée. Les fichiers binaires restent uniquement dans `.tmp/voice/`, ignoré par Git.
- Audio Core élargi : 40/41 PASS. L’assertion de source `tests/audio-integration-phase2b.test.mjs:93` attend le slider dans `FullScreenPlayer.tsx`, alors que la refonte lecteur déjà présente le délègue à `components/player/ListeningPlayer.tsx`. Aucun fichier lecteur ni ce test modifié dans le lot appels ; échec restant explicitement signalé.
- Messagerie locale chargée avec flag vocal absent : accueil/amis accessibles, aucun faux contrôle d’appel affiché.
- Pas de build complet dans cette passe ; pas de capture/lecture micro réelle, pas de test deux comptes/deux appareils, pas de validation TURN/NAT/4G, pas de mesure de charge ni de revue visuelle du panneau en appel réel. **Pas de GO production.**

## Conditions de validation

**Mise à jour du 24 septembre, publication demandée :** le site web peut publier
la candidate, avec appels accessibles uniquement aux comptes approuvés `test2`
et `ximamoff`, deux participants et un appel simultané. Ce pilote privé sur le
domaine canonique ne vaut pas ouverture publique du vocal. La configuration et
les réserves sont décrites dans [le lot de publication](release-messaging-20260924.md).
Les comptes hors liste conservent la messagerie sans accès aux appels.

1. Mesurer un appel privé puis un groupe sur deux appareils réels, dont un téléphone sur 4G/5G ; ne pas conclure sur un test LAN seul.
2. Tester le repli TURN avec UDP bloqué, ainsi que casque, refus micro, onglet en arrière-plan, coupure et retour réseau.
3. Tester invitations concurrentes, refus/expiration, départ du dernier participant, blocage/retrait et tentative d’accès non autorisée.
4. Vérifier la continuité de la messagerie et l’état AudioCore, sans changement de queue ni reprise intempestive.
5. Mesurer CPU, mémoire, bande passante et latence du site pendant les appels. Fixer ensuite une limite de groupe/concurrence compatible avec la VM ; les 24 membres possibles d’un groupe de messages ne constituent pas une capacité vocale prouvée.
6. Activation d’infrastructure et publication applicative distinctes, après revue, avec arrêt du seul service vocal comme retour arrière. Aucun déploiement effectué dans cette préparation.

## Sources officielles consultées

- [Auto-hébergement et différences avec Cloud](https://docs.livekit.io/transport/self-hosting/).
- [Licence du serveur](https://github.com/livekit/livekit/blob/master/LICENSE).
- [Déploiement, certificats et TURN](https://docs.livekit.io/transport/self-hosting/deployment/).
- [Ports et multiplexage UDP](https://docs.livekit.io/transport/self-hosting/ports-firewall/).
