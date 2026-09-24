# Appels Synaura — infrastructure isolée, application non activée

> Le statut « non activée » décrit l'installation initiale. La publication web
> avec pilote privé à deux comptes est maintenant autorisée ; voir
> [le dossier de publication](../../docs/release-messaging-20260924.md).

Service auto-hébergé **installé en première étape le 24 septembre 2026**, après autorisation. Candidate applicative non déployée, appels désactivés. Voir [le relevé d’installation, les tests et les réserves](../../docs/messaging-calls-self-hosted.md).

## Conditions impératives

- Une seule instance Next.js et un seul worker, comme la production canonique actuelle. La signalisation d’appel est éphémère en mémoire ; un redémarrage termine les appels. Ne pas utiliser plusieurs workers/réplicas avec cette implémentation.
- LiveKit avec `room.auto_create: false`. Chaque instance utilise exclusivement `synaura-voice-<private|public>-<instance>-<UUID>` ; `SYNAURA_CALLS_INSTANCE` est obligatoire et distinct entre prévisualisation et production. Au redémarrage, Synaura ferme uniquement ses anciennes salles. Ne jamais activer l’application contre un serveur où la création implicite n’a pas été désactivée et vérifiée.
- Secrets aléatoires indépendants de NextAuth et de la DB, créés hors Git. Aucune clé dans une variable `NEXT_PUBLIC_*`.
- LiveKit 1.13.7 repéré pour cette candidate. Vérifier l’archive Linux ARM64 avec les checksums officiels avant installation ; pas de `curl | sh`. L’exécutable Windows 1.13.7 a été téléchargé dans `.tmp/voice/`, ignoré, et son SHA-256 vérifié ; cela n’installe rien sur le serveur.
- Configurer WSS, certificats, ICE/NAT et TURN avant validation sur deux appareils dont un réseau cellulaire. Ne pas remplacer nginx sur 443 : le routage TURN/TLS demande une revue distincte.

## Fichiers

- `application.env.example` : variables serveur de l’application, désactivées par défaut ; modèle uniquement, aucun secret.
- `livekit.local.yaml.example` : configuration loopback de référence, pas une configuration WAN.
- `livekit.freebox.yaml` et `synaura-voice.service` : configuration réellement installée, clés hors dépôt, API loopback, ICE UDP/TCP, TURN UDP seulement et limites système.
- `install-stage-one.sh` : installation explicite ARM64, empreinte épinglée, refus des cibles déjà présentes, génération des secrets sur l’hôte, sauvegarde nginx ; aucune activation applicative ou modification NAT automatique. **Ne pas le relancer sur l’installation existante.**
- `nginx-bootstrap.conf`, `nginx-voice.conf`, `renew-voice-certificate.sh` : vhost additionnel, certificat webroot et renouvellement isolé. Le site existant reste sur 443 ; `turn.synaura.fr` en HTTPS n’est pas du TURN/TLS.
- `control-smoke.py` : sur l’hôte avec sudo, contrôles authentifiés avec salle technique éphémère, nettoyage garanti en fin normale/exception ; aucune base ni utilisateur réel. Ne pas utiliser ce script comme test audio.
- `scripts/voice-network-smoke.mjs` : HTTPS, TCP et STUN depuis le poste ; ne constitue pas une validation 4G/5G.
- `scripts/voice-private-preview.mjs` : build séparé `.next-voice-preview`, Next production loopback et tunnel SSH supervisé, limité aux UUID vérifiés de `ximamoff` et `test2`. Clés uniquement en mémoire, secret de session indépendant, expiration après 8 h. Utilise les vraies données : aucune création automatique d’amitié, message ou conversation. Le PC doit rester allumé.
- `nginx-test*.conf`, `install-test-preview.sh`, `renew-test-certificate.sh` : vhost temporaire dédié `voice-test.synaura.fr`, sans remplacer `preview` ou le site canonique ; build production seulement, aucun websocket de serveur dev. Ne pas relancer l’installation sur une cible existante.
- `scripts/voice-preview-smoke.mjs` : refus anonyme/session invalide/en-têtes de contournement, puis connexion E2E et lecture de la disponibilité. Aucun appel ou micro lancé ; sa propre session est fermée en fin de test.
- Le smoke `node scripts/voice-local-smoke.mjs .tmp/voice/livekit-server.exe` démarre puis arrête un serveur de test local sur 17880/17881 TCP et 17882 UDP. Ses clés sont aléatoires, en mémoire, non imprimées. Il ne lit pas la DB. Ce test de contrôle ne valide pas la voix WebRTC.

## Activation après revue

Pour le pilote approuvé seulement : `enable-private-production.mjs --check SHA`
puis `--apply SHA`, exécuté sur l'hôte avec sudo. Le SHA doit être celui de
`current` avant publication. Le script refuse tout écrasement, vérifie les deux
identités par SELECT avec le rôle applicatif, et crée uniquement un fichier
serveur protégé et un drop-in systemd. Aucun redémarrage direct : le déploiement
canonique effectue la bascule. Aucun flag de verrouillage du site de preview
n'est installé sur le site public. Ne pas relancer après installation.

Le binaire vérifié tourne sous un compte/service non-root indépendant avec limites de ressources, répertoire de secrets protégé et journalisation sans jetons. Les routes de signalisation sont derrière TLS ; 7880 reste lié au loopback. `auto_create: false` a été testé avec un jeton valide pour une salle absente. Le routage TURN/TLS, les appels entre appareils et la charge restent à valider avant configuration/activation de l’application.

La limite candidate est de 8 membres par conversation appelable et 4 appels simultanés. Ce sont des garde-fous provisoires, pas une capacité certifiée pour la VM 2 cœurs / 2 Go. Une discussion avec plus de 8 membres reste utilisable en messages mais l’appel est refusé, sans inviter arbitrairement un sous-ensemble.

Retour arrière : désactiver `SYNAURA_CALLS_ENABLED`, arrêter les appels du namespace dédié, puis arrêter le seul service vocal. Aucun changement de schéma ni suppression de messages. Ne pas lancer le déploiement applicatif habituel depuis ce dossier.

Dans l’état installé actuellement, le flag applicatif est absent et aucune salle réelle n’est utilisée. Arrêter/désactiver uniquement `synaura-voice.service` coupe le service ajouté. Les trois nouvelles règles Freebox et les deux nouveaux DNS sont identifiables dans le relevé ; leur retrait, si demandé, ne doit toucher ni 80/443 ni les enregistrements existants. Pour retirer le vhost additionnel, déplacer son seul lien hors `sites-enabled`, valider `nginx -t`, puis recharger nginx ; conserver certificats, clés et sauvegarde tant que le rollback n’est pas confirmé. Ne pas restaurer aveuglément l’ensemble du répertoire nginx sauvegardé par-dessus d’éventuels changements ultérieurs.
