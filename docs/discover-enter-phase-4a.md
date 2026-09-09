# Phase 4A — Discover & Enter Synaura

## Parcours constaté avant modification

- Visiteur sur `/` : le composant Live `SynauraScroll` était rendu immédiatement en mode « Invité ». Il n’existait ni présentation de l’univers, ni séparation Discover/Live.
- Membre sur `/` : le même composant était rendu, puis la session et les données du feed se résolvaient côté client.
- Auth : `/auth/signin` et `/auth/signup` utilisaient une direction visuelle claire et chaude, distincte du langage `syn-*` établi en Phase 3.
- Nouveau compte Credentials : signup, retour au login, puis callback ; `OnboardingGate` vérifiait ensuite les préférences côté client.
- OAuth : retour direct vers le callback fourni. L’onboarding dépendait ensuite du gate client.
- Onboarding : les choix étaient réellement enregistrés dans `profiles.preferences.onboarding` et utilisés par les signaux de recommandation, mais la page était accessible sans session et masquait les erreurs PATCH.
- `/landing` : landing technique autonome, avec trois blocs de bénéfices et des lecteurs HTML audio concurrents du récit de marque. Elle apparaissait avec du chrome Live.
- Routes historiques `/fermeture`, `/arret` et `/download` : toujours référencées ou utiles ; aucune n’a été supprimée.

## Architecture retenue

```text
visiteur / -> Discover Synaura -> /enter -> login ou signup
                                     |          |
                                     +----------+-> /enter/continue
                                                        |
                                      onboarding requis +-> /onboarding -> destination
                                      membre connu      +-> destination / Live

membre / -> décision serveur -> onboarding si incomplet, sinon redirection immédiate /live
deep link -> session boundary -> onboarding si nécessaire -> retour au deep link
```

La racine est `force-dynamic` et décide côté serveur avec NextAuth. Discover n’est donc jamais affiché comme flash à un membre. Un membre est redirigé vers `/live`, route privée dédiée qui conserve `SynauraScroll` et la navigation SPA. Ce découpage empêche surtout le bundle Live d’entrer dans le chargement public. La route musicale `/discover` ne change pas.

`/landing` reste disponible pour les liens historiques et rend la même expérience publique, avec canonical `/`. Les journaux Nginx accessibles pendant l’audit montraient trois requêtes courantes et aucune dans le journal précédent ; les seules références internes étaient la route elle-même et le sitemap. La faible mesure disponible ne justifiait pas une suppression risquée.

## Direction d’expérience

- Première visite : logo ample, apparition expressive courte, Aura respirante et invitation à explorer.
- Retour visiteur : la clé locale `synaura.discover.seen.v1` raccourcit l’entrée ; aucun tracking personnel.
- Membre : aucun Discover, accès serveur direct à Live.
- Storytelling : le son comme lieu, les personnes autour du morceau, la création, puis l’univers personnel.
- Démonstrations : données statiques isolées dans `lib/discoverDemo.ts`, aucune dépendance à une API privée et aucun écran vide si le catalogue tombe.
- Scroll : natif uniquement. Les scènes sont longues et aérées sur desktop, linéaires et moins coûteuses sur mobile. Aucun hijacking.

## Signature sonore

La signature temporaire est un son UI Web Audio très court. Elle ne se crée que dans le handler du bouton « Entrer dans Synaura », après geste explicite. Elle est coupable via le bouton visible, se ferme avant navigation, échoue silencieusement si le navigateur refuse Web Audio et n’utilise ni `Audio`, ni Audio Core, ni autoplay. Reduced motion réduit aussi sa durée et sa densité.

## Auth et onboarding

- Credentials et Google restent les providers existants.
- `/enter/continue` devient l’unique point de décision post-auth : onboarding ou destination sûre.
- Les callback URLs n’acceptent qu’un chemin interne sans backslash ni URL protocole-relative.
- Login conserve visibilité du mot de passe, reset, erreurs et loading.
- Le refus/échec OAuth reste dans `EntryFrame` avec une alerte accessible, sans retour à l’ancien lockup.
- Signup conserve trois étapes utiles, validations, limite de comptes et referral.
- Onboarding conserve les univers, moods, genres et intentions réellement stockés et consommés. Les erreurs de lecture/écriture deviennent visibles et une sauvegarde échouée ne redirige plus.

## SEO et événements

- Canonical `/`, title, description, OpenGraph, Twitter card et image sociale générée par `ImageResponse`.
- `/enter`, auth et onboarding restent `noindex`.
- Événements définis : `discover_view`, `enter_click`, `signup_start`, `signup_complete`, `login_complete`, `onboarding_start`, `onboarding_complete`.
- Aucune nouvelle plateforme analytics : les événements non personnels sont émis sur `synaura:entry-event` pour les consommateurs existants ou futurs.

## Accessibilité et mouvement

- Landmarks, titres ordonnés, liens d’ancrage, boutons réels, labels de formulaires, alertes et états occupés.
- Zoom préservé par la fondation Phase 3.
- `prefers-reduced-motion` garde une Aura lente et une progression lisible au lieu de supprimer toute présence.
- `prefers-reduced-data` retire le grain et les backdrop filters décoratifs.
- Aucun contenu informatif n’est porté uniquement par une animation.

## Budget de performance

- Aucune nouvelle dépendance, vidéo, Lottie, canvas ou image raster de scène.
- Logo public : SVG local de moins de 1 Ko.
- Narration autonome, sans requête API.
- Build final : `/` et `/landing` à 312 kB de First Load JS ; `/live` à 381 kB. Le découpage évite donc environ 69 kB de JavaScript initial au visiteur par rapport au chargement de Live.
- Validation navigateur : 320, 390, 430, 1024, 1440 et 1920 px sans débordement horizontal ; aucun élément `audio`, `video` ou `canvas` au chargement public.
- Objectif Phase 4A : aucun CLS structurel, LCP textuel/logo, animations CSS transform/opacity, zéro boucle JavaScript 60 FPS.
- Les providers globaux historiques restent montés par le root layout ; leur découpage en groupes de routes demanderait une migration plus large et reste une dette mesurable de Phase 4B.

## Routes explicitement non supprimées

- `/discover` : découverte musicale Live.
- `/landing` : compatibilité publique.
- `/fermeture` et `/arret` : pages historiques/légales.
- `/download` : téléchargement Android actif.
