# Abonnements — candidate locale

## Présentation

- Offres Free, Starter et Pro avant le tableau de bord du compte.
- Prix annuels réels, équivalent mensuel et rythme de facturation explicites.
- Crédits, modèles V6, quotas et comparaison lisibles sur mobile et desktop.
- Gratuit et packs ponctuels présentés sans urgence artificielle ni nouvelle sollicitation automatique.
- FAQ dépliable, décor animé léger, pause d’ambiance et préférence de mouvement réduit respectées.
- Lien discret Abonnements dans le rail desktop ; mobile conserve ses cinq destinations et son Menu existant.
- La page tarifaire est publique, sans dépendre de l’onboarding. Les pages de succès et routes privées conservent leur contrôle ; les API de compte et de paiement gardent leurs vérifications de session.
- Aucun prix, crédit, modèle autorisé, endpoint ou composant de paiement modifié. La messagerie est indiquée disponible en Free conformément aux routes de messagerie actuelles, qui ne demandent pas d’abonnement.

## Défaut observé et corrigé

Après sélection de Starter mensuel, basculer sur Annuel conservait l’identifiant Stripe précédent tout en affichant « Plan Plan » et le prix de Pro annuel. Le changement de période efface désormais la sélection et l’aperçu de proration. L’utilisateur choisit à nouveau son offre. Régression couverte par exécution du vrai callback et rejouée dans l’interface sans ouvrir Stripe.

## Validation locale

- TypeScript : PASS.
- Suite complète : 848 tests PASS, 0 échec, 0 ignoré.
- `git diff --check` : PASS.
- Compilation de la route par le serveur de développement : PASS. Build production non relancé pour cette candidate visuelle.
- Largeurs CSS mesurées : 1440, 1024, 390 et 320 pixels ; aucun débordement horizontal du document. Le navigateur ayant un zoom préexistant à 80 %, les dimensions d’override ont été compensées et les dimensions CSS relues avant validation.
- Mensuel/annuel, récapitulatifs Starter/Pro, réinitialisation de sélection, FAQ, accès depuis Menu mobile : PASS.
- Tab et Shift+Tab : sélection de période accessible et focus visible.
- Pause globale : les quatre anneaux passent effectivement en état paused, puis reprennent ; préférence initiale restaurée.
- Reduced motion : protection CSS et décor raccordé au mécanisme existant ; aucun nouveau moteur d’animation ni boucle JavaScript.
- Captures : `artifacts/membership-v3/desktop-1440.png`, `mobile-390.png` et `desktop-plans-1440.png`.

## Limites

Le PC est hors du réseau privé Synaura. Les données de compte et de paiement réelles ne sont donc pas validées : erreurs de session/données attendues dans cet environnement, solde indisponible affiché comme tel, pas comme un zéro confirmé. Aucun achat, changement d’abonnement, résiliation ni modification de données effectué. Pas de validation de paiement Stripe bout en bout.

Console : avertissement Stripe HTTP attendu en local. L’ouverture du Menu avec la session locale incomplète signale aussi une clé `/settings` dupliquée : le lien « Mon profil » existant utilise le même fallback que Paramètres lorsque le pseudo manque. Cette logique préexistante n’a pas été modifiée ; ne pas conclure à une console entièrement vierge. Les erreurs temporaires de feuille CSS manquante pendant son écriture ont disparu après compilation.

La configuration tarifaire et les mécanismes existants de distribution de crédits sont conservés ; leur exécution mensuelle en production n’a pas été réauditée dans ce chantier visuel.

Aucun commit, push ni déploiement. Les modifications précédentes de recherche et les modifications utilisateur hors périmètre sont préservées.
