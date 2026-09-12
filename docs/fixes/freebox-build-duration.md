# Infra séparée — durée des builds Freebox

Statut : OPEN, observation uniquement. Aucun tuning système ou optimisation de build dans 4B.8.

Dernière livraison au moment du relevé initial, 4B.7 : npm ci 1 min 40,877 s ; build 14 min 26,661 s. Application restée disponible HTTP 200 pendant le build, puis redémarrage/bascule canonique réussis. Ancienne livraison 4B.6 : build environ 15 minutes. Relevé antérieur au build de livraison finale 4B.8.

Relevé read-only hors build du 12 septembre 2026 : RAM hôte 1977 MiB, utilisée 721 MiB, disponible 1256 MiB ; swap utilisé 212/4095 MiB. Service applicatif MemoryCurrent 168 636 416 octets, aucun redémarrage automatique. Ces valeurs ne sont PAS les pics de RAM/swap pendant compilation ; pics historiques non récupérés, aucune estimation inventée.

À instruire séparément : mesurer les pics RAM/swap pendant un prochain déploiement autorisé, séparer installation, webpack, types, génération et traces, comparer plusieurs livraisons avant de proposer un changement. Préserver disponibilité, limites mémoire et rollback. Aucune nouvelle dépendance ni modification d'infrastructure autorisée implicitement par ce ticket.
