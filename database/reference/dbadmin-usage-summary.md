# Classification des usages dbAdmin — Phase 1B

Classification statique reproductible des appels directs runtime `dbAdmin.from/rpc`. Les groupes sont exclusifs et leur somme doit rester egale au total Phase 1A.

- A — lecture normale : 590
- B — mutation utilisateur normale : 260
- C — operation administrative : 61
- D — webhook/callback : 4
- E — maintenance/diagnostic : 18
- F — auth : 1
- G — systeme/cron : 0
- H — besoin demontre de privileges eleves : 0
- I — usage injustifie ou indetermine : 0

Total : 934 appels dans 192 fichiers.

H reste reserve aux operations exigeant un pouvoir PostgreSQL superieur aux grants applicatifs cibles. Aucun appel `from/rpc` n'a demontre ce besoin : les operations transverses sont couvertes par C, D, E, F ou G, et les RPC atomiques peuvent etre accordees explicitement au role applicatif.
