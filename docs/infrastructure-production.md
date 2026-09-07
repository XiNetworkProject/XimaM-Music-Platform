# Infrastructure de production Synaura — Phase 0C

Etat au 7 septembre 2026 : **audit reel termine, protections installees et
validees**.

Branche applicative observee : `migration/freebox-storage`, commit de production
`49deac7562192ae0867638e7f94c2a98e371c2d6`.

Ce document est la source de verite de l'infrastructure. Les anciens guides
Vercel, Supabase et Cloudinary ne decrivent pas necessairement la production.
Aucun secret n'est consigne ici.

## 1. Architecture reellement constatee

```text
Internet
  -> IPv4 publique Freebox / NAT
     -> TCP 80/443
        -> nginx 1.22.1, Debian 12 arm64
           -> synaura.fr, www, preview
              -> Next.js 14.2.30, 127.0.0.1:3000, un seul worker
                 -> PostgreSQL 17.11, 127.0.0.1:5433, base postgres
                 -> medias CIFS /mnt/Synaura-SSD/apps/synaura/media
           -> media.synaura.fr
              -> fichiers statiques sur le meme volume CIFS
```

L'hote est `synaura-server`, Debian GNU/Linux 12 bookworm, noyau
`6.1.0-52-arm64`, architecture `aarch64`. L'application tourne sous le compte
non-root `synaura` (uid/gid 1000). Node est en version 24.18.1 et npm 11.16.0.

Le disque systeme est `/dev/vda1`, ext4, 59 Gio, avec le PARTUUID
`a55c0829-e5fb-4984-8afc-258e199ed514`. Au dernier controle il utilisait 27 Gio
(47 %) et disposait de 31 Gio. Le SSD media est un partage CIFS de 469 Gio,
utilise a 29 Gio (7 %), avec 440 Gio disponibles.

Il n'existe pas de pare-feu hote actif (`ufw`, `firewalld`, `nft` et `iptables`
absents). La NAT Freebox n'expose publiquement que 80/443 parmi les ports testes :
22, 3000, 3100, 5432 et 5433 sont fermes depuis l'exterieur. Node, Weyra et les
deux clusters PostgreSQL sont maintenant lies exclusivement au loopback.

## 2. Node, systemd et rate limiting

Production :

- release active : `/srv/apps/synaura/releases/49deac...` ;
- lien atomique : `/srv/apps/synaura/current` ;
- commande : `npm run start -- --hostname 127.0.0.1 --port 3000` ;
- superviseur : `synaura.service`, active et enabled ;
- utilisateur : `synaura`, jamais root ;
- PID systemd final constate : 6805, serveur Next PID 6827 ;
- un seul processus `next-server` Synaura ; le second processus Next observe sur
  l'hote est Weyra, sous un autre utilisateur et sur 127.0.0.1:3100 ;
- `Restart=on-failure`, delai 5 s, SIGTERM, timeout d'arret 30 s ;
- demarrage apres reseau et PostgreSQL 17, et montage media requis.

Conclusion rate limiter : le compteur memoire des Phases 0A/0B est coherent
avec l'architecture Synaura mono-processus actuelle. Il est remis a zero lors
d'un restart et ne deviendrait plus global si un second worker Synaura etait
ajoute. Une migration vers un compteur partage reste alors obligatoire.

Nginx ecrase maintenant `X-Real-IP` et `X-Forwarded-For` avec `$remote_addr`.
Une valeur fournie par le client ne peut donc plus choisir l'identite IP utilisee
par le rate limiter.

## 3. PostgreSQL reel et conclusion RLS

L'application utilise :

- PostgreSQL 17.11, cluster Debian nomme `17/restore` ;
- socket TCP `127.0.0.1:5433`, base `postgres` ;
- data directory `/var/lib/postgresql/17/restore` sur `/dev/vda1` ;
- role `synaura_app`, login, non-superuser, sans CREATEDB, CREATEROLE ni
  replication, sans heritage applicatif ;
- `synaura_app` possede toutefois `BYPASSRLS` ;
- quatre connexions idle normales avec `application_name=synaura-next`.

Le cluster PostgreSQL 15 `main` sur 5432 existe encore. Sa base `synaura` est
vide (environ 7,5 Mio) et n'est pas la production. Il reste actif pour le moment
afin de ne pas confondre audit d'infrastructure et nettoyage de services.

Catalogue de la base de production :

- 95 tables dans `public` ;
- 62 avec RLS active, 33 sans RLS, aucune avec `FORCE ROW LEVEL SECURITY` ;
- policies sur 61 tables ;
- tables principales appartenant a `postgres` ;
- `synaura_app` a SELECT/INSERT/UPDATE/DELETE effectifs sur les 95 tables ;
- 15 fonctions `SECURITY DEFINER` dans `public`, plusieurs executables par
  `PUBLIC`/`anon`/`authenticated` et plusieurs sans `search_path` fixe ;
- `auth.uid()` et `auth.role()` lisent les claims de session ; elles retournent
  NULL pour `synaura_app` en fonctionnement normal ; un claim synthetique de
  test retourne correctement l'UUID et le role attendus ;
- le code Next n'injecte pas de claims PostgreSQL et effectue ses controles
  d'identite avant les requetes SQL.

**Conclusion definitive : D — architecture hybride.** Les policies RLS restent
potentiellement protectrices pour les roles Supabase `anon`/`authenticated`,
mais le chemin serveur reel est le cas B : `synaura_app` contourne integralement
RLS. Pour Next.js, la protection effective repose donc sur les controles
applicatifs des routes. Les tables sans RLS et les fonctions `SECURITY DEFINER`
sont en partie legacy. Aucune refonte massive de roles/policies n'a ete faite en
Phase 0C ; ce chantier appartient a la Phase 1.

PostgreSQL ecoute uniquement sur localhost. Le `pg_hba.conf` utilise peer sur le
socket Unix et SCRAM-SHA-256 sur 127.0.0.1/::1. Aucun port PostgreSQL n'est
accessible depuis le WAN.

## 4. Montage SSD et protection anti-fallback

Le montage reel est :

```text
source  //mafreebox.freebox.fr/Synaura SSD
cible   /mnt/Synaura-SSD
type    cifs 3.1.1
fstab   guest,uid=synaura,gid=synaura,comment=cloudconfig
```

Un partage CIFS n'a pas d'UUID bloc local. Son identite forte repose donc sur
trois preuves combinees : mountpoint reel, source CIFS exacte et marqueur aleatoire.

- marqueur volume : `/mnt/Synaura-SSD/.synaura-volume.id` ;
- copie attendue : `/etc/synaura/media-volume.id`, `root:synaura`, mode 0640 ;
- le preflight compare les deux octet par octet, verifie le type `cifs`, la source,
  le repertoire media et les droits du compte `synaura` ;
- `RequiresMountsFor=/mnt/Synaura-SSD` et `ExecStartPre=.../preflight.sh` sont
  installes dans `synaura.service` ;
- aucune `ConditionPathIsMountPoint` silencieuse n'est utilisee : un mauvais
  volume fait echouer explicitement le demarrage.

Le test non destructif avec une fausse source attendue a retourne le code 2 et
`PREFLIGHT CRITICAL`, tandis que le test reel retourne `PREFLIGHT OK`. Le risque
de recreer silencieusement les medias sur `/` est donc bloque au demarrage.

## 5. Nginx, HTTPS et serveur media

Les quatre noms `synaura.fr`, `www.synaura.fr`, `preview.synaura.fr` et
`media.synaura.fr` redirigent HTTP vers HTTPS. Les certificats ECDSA Let's Encrypt
sont valides jusqu'au 12 novembre 2026. `certbot.timer` est actif et les quatre
fichiers de renouvellement utilisent le plugin nginx.

TLS 1.2 et 1.3 sont valides. HSTS est actif sur tous les vhosts HTTPS :

```text
Strict-Transport-Security: max-age=31536000
```

`preload` et `includeSubDomains` ne sont pas actives. La banniere ne donne plus
la version nginx et `X-Powered-By` est masque. WebSocket/SSE utilisent HTTP/1.1,
Upgrade/Connection et des timeouts de 300 s. `/debug` et ses descendants sont
bloques par nginx en 404 ; `/api/debug` retourne aussi 404.

Le health public `/healthz` renvoie uniquement `ok` en texte, sans version,
chemin, configuration ni detail interne. Il prouve le frontal ; le health
systemd interne verifie Node, PostgreSQL, montage et disques.

`media.synaura.fr` :

- racine et fichiers inconnus : 404, autoindex desactive ;
- fichiers caches/techniques commencant par un point et `cloudinary/_*` : 404 ;
- traversals testes : 400/404 ;
- Range natif valide sur MP3, MP4 et APK ;
- MP3 `audio/mpeg`, MP4 `video/mp4` ;
- medias versionnes : cache 30 jours ;
- `latest.json` : JSON, CORS, `no-store`, OPTIONS 204 ;
- APK : `application/vnd.android.package-archive`, Range 206 ;
- les APK sont publies exclusivement sous
  `synaura-<versionName>-<versionCode>.apk`, donc un cache d'un an `immutable`
  est sur dans ce workflow ;
- un POST sur les fichiers statiques est rejete en 405.

Le volume media contient environ 2,4 Gio et 693 fichiers lors de la sauvegarde
initiale. Les pieces jointes de messages restent servies depuis une origine
publique si leur URL est connue ; ce modele d'acces doit etre traite en Phase 1.

## 6. Sauvegarde PostgreSQL et restauration

Aucune sauvegarde Synaura fiable n'existait avant cette phase. La solution active
est maintenant :

- timer `synaura-db-backup.timer`, quotidien a 03:15 Europe/Paris avec delai
  aleatoire maximal de 10 minutes, persistent ;
- retention 14 jours ;
- `pg_dump`/`pg_restore` 17 depuis `/usr/lib/postgresql/17/bin` ;
- dump custom, sans owner ni ACL, chiffre avant ecriture sur le partage CIFS ;
- AES-256-CBC, PBKDF2-SHA256, 200 000 iterations, sel aleatoire ;
- checksum SHA-256 du fichier chiffre ;
- publication atomique et pointeur atomique `latest.txt` car CIFS ne supporte
  pas les liens symboliques ;
- source `/dev/vda1`, destination physiquement distincte sur le SSD CIFS ;
- cle serveur `/etc/synaura/backup-encryption.key`, root:root 0600 ;
- copie de recuperation hors depot sur le poste operateur :
  `C:\Users\mvadn\.synaura-recovery\backup-encryption.key`, ACL limitee au
  compte courant, SYSTEM et Administrateurs ; empreintes identiques.

Premier dump chiffre valide :
`synaura-20260907T193959Z.dump.enc`, 3 632 656 octets. Son en-tete chiffre est
`Salted__`, son checksum passe et aucun `.dump` en clair ne subsiste sur le CIFS.
Les deux dumps en clair produits pendant la mise au point ont ete supprimes apres
validation du dump chiffre ; une suppression sur stockage CIFS ne garantit pas
l'effacement physique des blocs sous-jacents.

Test de restauration isole :

- base creee : `synaura_restore_phase0c_20260907` ;
- 137 tables utilisateur restaurees ;
- 32 profils, 232 pistes et 38 comptes auth lus ;
- aucune restauration sur `postgres` ;
- base temporaire supprimee automatiquement apres succes ;
- controle final : `TEMP_DB_AFTER=0`.

## 7. Sauvegarde media

La sauvegarde media active utilise un device distinct du SSD source :

- source CIFS : `/mnt/Synaura-SSD/apps/synaura/media` ;
- destination ext4 : `/var/backups/synaura/media`, root:root 0700 ;
- snapshots rsync atomiques et hardlinks vers le precedent ;
- `--one-file-system`, liens surs, retention 14 jours ;
- timer quotidien a 04:15 Europe/Paris, delai aleatoire maximal 15 minutes,
  persistent ;
- disparition du mount, mauvaise source ou mauvais marqueur : echec explicite.

Snapshot initial : `/var/backups/synaura/media/20260907T194350Z`, 2,4 Gio,
693 fichiers source et 693 fichiers destination. Le controle rsync a sec retourne
zero difference. Un defaut initial de mtime de racine a ete corrige avec
`--omit-dir-times` et un mtime de publication ; le snapshot final est conserve.

Cette copie protege contre la perte du SSD media, pas contre la perte simultanee
de l'hote et de la Freebox. Une replication chiffree hors site reste recommandee.

## 8. Health checks, disque et journaux

`synaura-health.timer` s'execute toutes les cinq minutes. Le dernier cycle
automatique a valide :

- reponse HTTP locale de Next.js ;
- vraie requete `select 1` en PostgreSQL ;
- mountpoint, source CIFS, marqueur et droit d'ecriture `synaura` ;
- `/` et data PostgreSQL a 47 % ;
- SSD et destination DB a 7 % ;
- destination media ext4 a 47 %.

Seuils : warning 80 %, critique 90 %. Une disparition du montage est une erreur
distincte du manque d'espace. Les erreurs sont visibles comme echec systemd et
dans journald. Aucune notification externe (mail/PagerDuty) n'est configuree.

Les logs Next, backup et health vont dans journald. Nginx utilise le logrotate
Debian quotidien, 14 rotations compressees. PostgreSQL utilise 10 rotations
hebdomadaires. `/var/log/synaura-deploy.log` a maintenant sa propre rotation
quotidienne, 14 rotations, plafond 50 Mio. La configuration logrotate passe en
mode debug.

## 9. Deploiement canonique et rollback

Le timer `synaura-deploy.timer` interroge toutes les cinq minutes
`origin/migration/freebox-storage`. Le script actif est versionne dans
`infra/scripts/deploy-release.sh` et son `--check` passe.

Procedure :

1. verifier un commit exact sur la branche distante ;
2. prendre le verrou de deploiement ;
3. creer un worktree/release sous `/srv/apps/synaura/releases/<sha>` ;
4. executer `npm ci` comme `synaura` ;
5. construire avec l'environnement de production hors Git ;
6. executer le preflight build, DB, source/marker SSD et permissions ;
7. basculer atomiquement `/srv/apps/synaura/current` ;
8. redemarrer `synaura.service` ;
9. verifier service et HTTP local pendant 20 secondes ;
10. en echec, repointer atomiquement vers la release precedente et redemarrer.

Le build seul n'est jamais considere comme une preuve de sante. Les migrations
destructives ne font pas partie de ce workflow.

Rollback infrastructure :

- service/deploy precedents archives sous
  `/var/backups/synaura-config/phase0c-20260907T192758Z` ;
- anciennes configurations nginx conservees sous `sites-available` et copiees
  sous `/var/backups/synaura-config/nginx-phase0c-20260907T193118Z` ;
- le vhost actif est le seul lien
  `/etc/nginx/sites-enabled/synaura-phase0c` ;
- tout rollback nginx doit restaurer les trois anciens liens, passer `nginx -t`,
  puis seulement recharger nginx ;
- le rollback applicatif repointe `current` vers la release precedente.

## 10. Fichiers installes cote serveur

Scripts :

- `/usr/local/libexec/synaura/preflight.sh` ;
- `/usr/local/libexec/synaura/backup-postgres.sh` ;
- `/usr/local/libexec/synaura/restore-postgres-isolated.sh` ;
- `/usr/local/libexec/synaura/backup-media.sh` ;
- `/usr/local/libexec/synaura/healthcheck.sh` ;
- `/usr/local/sbin/synaura-deploy`.

Configuration :

- `/etc/systemd/system/synaura.service` ;
- `/etc/systemd/system/synaura-{db-backup,media-backup,health}.{service,timer}` ;
- `/etc/synaura/backup.env` 0600 ;
- `/etc/synaura/pg_service.conf` root:postgres 0640 ;
- `/etc/synaura/media-volume.id` root:synaura 0640 ;
- `/etc/synaura/backup-encryption.key` root:root 0600 ;
- `/etc/nginx/sites-available/synaura-phase0c` ;
- `/etc/nginx/sites-enabled/synaura-phase0c` ;
- `/etc/logrotate.d/synaura`.

Secrets et valeurs reelles restent hors Git. Le `MEDIA_STORAGE_SECRET` actuel est
vide et le code utilise le fallback `NEXTAUTH_SECRET`. Le separer immediatement
invaliderait les signatures/ownership tags existants ; cette rotation exige une
migration planifiee en Phase 1.

## 11. Fichiers versionnes dans le depot

`infra/` contient les exemples d'environnement, la configuration nginx adaptee,
les services/timers systemd, les scripts audit/preflight/deploy/backup/restore/
health, la rotation et l'audit PostgreSQL. Le present fichier est la documentation
canonique. Aucun commit n'a ete cree et les modifications applicatives deja
presentes dans le worktree ont ete preservees.

## 12. Validations executees

- audit read-only complet hote et `infra/postgres/audit.sql` sur PostgreSQL 17 ;
- `bash -n` sur les sept scripts ;
- `systemd-analyze verify` sur les sept unites/timers ;
- `nginx -t` avant et apres chaque reload ;
- preflight reel OK et test negatif de mauvaise source en code 2 ;
- backup DB, checksum, dechiffrement et `pg_restore --list` ;
- restauration DB isolee puis suppression prouvee ;
- backup media, tailles, comptes et rsync dry-run a zero ;
- health manuel puis automatique ;
- port 3000 loopback, un seul worker Synaura ;
- HTTP 301 et HTTPS 200 pour les quatre noms ;
- TLS 1.2/1.3, HSTS, health minimal, debug 404 ;
- MP3/MP4/APK Range, MIME, cache, CORS/OPTIONS et 404/traversal ;
- WAN : 80/443 ouverts, 22/3000/3100/5432/5433 fermes ;
- routes critiques : accueil 200, API featured 200 ;
- 13 tests routes critiques, 11 tests Phase 0B et 4 tests media : 28/28 ;
- `npm run type-check` ;
- `git diff --check` et recherche de secrets dans `infra/`.

Le seul redemarrage volontaire de Synaura a dure environ 3,7 secondes. Les
41 sondes HTTPS externes paralleles ont toutes reussi. Les reloads nginx ont eu
zero echec observe. Les echecs de mise au point backup/health sont conserves dans
journald, mais les versions finales passent et `systemctl --failed` retourne zero
unite.

## 13. Risques restant ouverts

- RLS est contourne par `synaura_app`; fonctions `SECURITY DEFINER`, grants et
  tables sans RLS doivent etre durcis en Phase 1 ;
- le partage CIFS utilise `guest`, `sec=none` et l'option `soft`; le dump DB y est
  chiffre, mais les medias reposent sur la securite du LAN et des URLs ;
- le backup media n'est pas replique automatiquement hors site ;
- la cle de recuperation locale doit elle-meme entrer dans une sauvegarde sure de
  l'operateur, sans jamais etre ajoutee au depot ;
- aucune alerte externe n'est branchee sur les echecs systemd/certbot ;
- aucun pare-feu hote n'est present, meme si les services sensibles sont lies au
  loopback et fermes par la NAT WAN ;
- le cluster PostgreSQL 15 vide reste actif et peut creer de la confusion ;
- le rate limiter reste volatile lors d'un restart ;
- la separation de `MEDIA_STORAGE_SECRET` demande une migration des tags existants.

Ces risques sont documentes et ne remettent pas en cause les protections P0
d'exploitation installees. Ils ne doivent pas etre traites implicitement dans
cette phase.

## 14. Verdict

`PHASE 0C CLOSED`

L'audit reel, la protection anti-fallback SSD, le binding loopback, Nginx/HSTS,
les sauvegardes sur devices distincts, le chiffrement DB, la restauration isolee,
le snapshot media, les health checks, les timers, la rotation et le workflow de
rollback sont installes et valides. La Phase 1 n'a pas commence.
