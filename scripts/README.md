# Scripts opérationnels et historiques

Les seuls scripts applicatifs actifs sont ceux déclarés dans `package.json`. Ils
utilisent le stockage local et la configuration serveur courante.

Les anciens scripts de migration, diagnostic ou création de schéma qui importent
le SDK Supabase sont conservés uniquement comme archives techniques. Ils ne sont
appelés ni par l'application, ni par le build, ni par les tâches npm, et le SDK
Supabase n'est plus installé. Ne pas les exécuter contre la base PostgreSQL locale.

Tout nouvel outil opérationnel doit utiliser `DATABASE_URL`, des requêtes SQL
paramétrées et une transaction explicite lorsqu'il modifie plusieurs tables.
