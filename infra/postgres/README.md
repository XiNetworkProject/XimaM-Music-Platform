# PostgreSQL

`audit.sql` est strictement en lecture seule. Il inventorie la version, les
reglages reseau, les roles, les privileges, les tailles, connexions, extensions,
index, politiques RLS, vues et fonctions `SECURITY DEFINER`.

Execution locale recommandee sur l'hote, sans URL de connexion dans la ligne de
commande :

```sh
sudo -u postgres psql -X -p 5433 -d postgres --set=ON_ERROR_STOP=1 \
  --file=infra/postgres/audit.sql
```

Les deux fichiers `*.example` ne sont pas des migrations. Ne pas les copier tels
quels : leur compatibilite et les noms de roles doivent etre compares a
l'instance reelle. Toute modification de `listen_addresses` ou `pg_hba.conf`
necessite une fenetre de changement et une session administrateur de secours.
