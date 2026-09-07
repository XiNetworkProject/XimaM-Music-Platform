# Reference generee Phase 1A

Snapshot catalogue read-only SHA-256 : `c43bcef8a6cb5e555a617ad0a5130c6ed2d05a88b51e80e43abb2f77b5d73fe0`.

- 156 relations/sequences/vues inventoriees.
- 171 fonctions/procedures inventoriees.
- 84 fichiers SQL historiques classes.
- Categories SQL : A=15, B=29, C=4, D=5, E=9, F=20, G=2, H=0.
- 934 appels directs runtime `dbAdmin.from/rpc` dans 192 fichiers; 934 appels en incluant les scripts historiques.
- 1148 occurrences textuelles de `dbAdmin` dans 199 fichiers analyses.
- 2189 occurrences textuelles de `any` dans les racines analysees (indicateur large, pas uniquement DB).

- 18 objets litteraux references par le code mais absents de la production.

## Classification des objets

- inconnu: 74
- infrastructure/auth: 143
- legacy mais encore reference: 4
- legacy sans reference retrouvee: 2
- probablement utilise: 6
- utilise par le runtime: 98

Les CSV de `catalog/` sont des exports de catalogues PostgreSQL sans donnees utilisateur. `code-database-map.csv` est une cartographie statique : les references dynamiques restent a verifier manuellement.
