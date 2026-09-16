# Synaura V2 — promotion canonique

Publication autorisée le 16 septembre 2026 après validation de l'accueil enrichi
et du logo transparent. Cette décision lève la suspension décrite dans le rapport
du pilote : la nouvelle version remplace les pages principales Live et Discover.

- `/live` : PilotShell + PilotLive ; authentification et onboarding conservés.
- `/discover` : PilotShell + PilotDiscover ; accès public conservé, requêtes après
  résolution de session, sans imposer un compte.
- Navigation canonique et snapshot Live conservé. Alias `/v2/*` compatibles,
  authentifiés et noindex. Page d'entrée publique inchangée.
- Lecteur Discover unique ; moteur AudioCore inchangé. Aucun élément audio ajouté.
- Logo SVG transparent validé, sans bitmap ni fond opaque.

670 tests passent, dont les contrats de promotion et de continuité. Les attentes
historiques de chrome changent uniquement pour les deux routes promues.
Le build final et les contrôles HTTP sont rejoués avant publication.
La revue visuelle desktop/mobile de l'accueil a été faite avant cette promotion.
Téléphone physique et NVDA non testés ; aucune nouvelle validation navigateur
interactive n'est revendiquée durant la publication.

Déploiement : commit isolé, push, workflow Freebox canonique, preflight, bascule
atomique, health check, correspondance current/last-successful-sha et rétention.
Rollback opérationnel : release précédente via la procédure existante.
Aucune migration, changement natif, campagne mail ou génération musicale.
Les modifications utilisateur hors périmètre et artifacts restent hors commit.
