# Médias historiques Cloudinary — HTTP 401

Statut : ouvert. Correctif séparé de Phase 4B.4, autorisé à suivre mais non implémenté ici.

## Constat du 12 septembre 2026

Le runner Comments/Moments rencontre trois réponses HTTP 401 de
`res.cloudinary.com/dtgglgtfx`, reproductibles par requête directe, hors candidate :

- avatar historique `ximamoff_avatar_1758745905.png` ;
- avatar historique `keurlilamelo_avatar_1781610003.jpg` ;
- cover historique `cover_1758481606881_hx28s79n2.jpg`.

L'API production du profil ximamoff expose encore l'URL Cloudinary historique.
L'API production du morceau concerné expose en revanche une cover
`media.synaura.fr/cloudinary/image/...` : ne pas conclure que cette cover de
production est cassée sur la seule base du fallback local.

## Suite séparée

Vérifier disponibilité/identité des fichiers migrés, règles CDN et références
persistées avant de choisir un correctif. Ne pas modifier à l'aveugle les URLs,
les permissions Cloudinary ou les données utilisateur. Valider ensuite les
avatars et covers réellement concernés en production.

Critère de fermeture : images attendues accessibles, sans nouvelle erreur HTTP
401 ni régression des URLs migrées. Aucun secret ni réglage d'accès dans ce ticket.
