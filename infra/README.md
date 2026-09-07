# Infrastructure Synaura

Ce dossier versionne les configurations et outils d'exploitation de Synaura.
Ils ont ete adaptes le 7 septembre 2026 a l'hote Debian 12 reel, au service
`/srv/apps/synaura/current` et au cluster PostgreSQL 17 `restore` sur le port
5433. L'etat d'installation exact est suivi dans la documentation canonique.

La source de verite humaine est
[`docs/infrastructure-production.md`](../docs/infrastructure-production.md).

## Arborescence

- `env/` : exemples sans secret pour l'application et les sauvegardes ;
- `nginx/` : exemple de reverse proxy et de serveur media ;
- `systemd/` : service Next.js et timers de sauvegarde/sante ;
- `postgres/` : audit SQL en lecture seule et exemples de confinement reseau ;
- `scripts/` : audit, preflight, sauvegarde, restauration isolee et sante ;
- `logrotate/` : exemple de rotation des journaux nginx dedies.

## Regles d'utilisation

1. Executer d'abord `scripts/audit-readonly.sh` depuis la racine du projet sur
   l'hote de production et archiver sa sortie hors du depot.
2. Comparer les chemins, utilisateurs, executables et noms de services detectes
   avec les modeles. Ne jamais installer un modele sans adaptation.
3. Conserver les secrets dans `/etc/synaura/*.env`, un `pgpass` ou un magasin de
   secrets, avec permissions `0600`; ne jamais les placer dans Git.
4. Tester `nginx -t`, `systemd-analyze verify`, les scripts en mode `--check`, puis
   effectuer le changement avec sauvegarde des fichiers precedents et retour
   arriere explicite.
5. Ne jamais activer une sauvegarde si la destination est sur le meme systeme de
   fichiers que la donnee source, sauf acceptation documentee du risque. Les
   scripts refusent ce cas par defaut.

Les modeles retiennent volontairement **un seul processus Next.js**. Le rate
limiter applicatif de la Phase 0B reside en memoire et n'est pas partage entre
workers ou instances.

Les sauvegardes et le deploiement acceptent `--check` comme premier argument.
Ce mode ne cree ni fichier, ni verrou, ni release ; les destinations doivent deja
exister afin que leur device puisse etre compare a celui de la source.

Le partage CIFS Freebox ne supporte pas les liens symboliques et force des modes
de fichier larges. Les dumps PostgreSQL y sont donc chiffres avant ecriture ; le
dernier est reference par le fichier atomique `latest.txt`. Les snapshots media,
stockes sur ext4, conservent un lien `current`.

Lors d'une installation approuvee, copier les scripts dans
`/usr/local/libexec/synaura/` avec proprietaire `root:root` et mode `0750`. Les
  fichiers d'environnement restent hors Git en `0640` ou `0600` selon le compte
  consommateur. Le service libpq de production utilise le socket Unix et
  l'authentification peer du compte `postgres`; aucun mot de passe de backup
  n'est stocke.
