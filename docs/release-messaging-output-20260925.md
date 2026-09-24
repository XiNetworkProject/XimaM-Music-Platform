# Messagerie : sortie audio et hauteur — 25 septembre 2026

## Périmètre

Demande utilisateur : appel réel confirmé fonctionnel, ajouter le haut-parleur,
corriger la hauteur entre les navigations et publier. Aucun changement de modèle
de données, de permissions d'appel, d'AudioCore ou de fonctionnalités natives.

- Panneau d'appel : contrôle « Haut-parleur / sortie audio ». Liste des vraies
  sorties autorisées, choix natif supplémentaire si disponible, sortie système.
  `Room.switchActiveDevice('audiooutput', ...)` conserve le micro et l'appel,
  applique la sortie aux participants présents et aux futurs flux distants.
  Une seule sélection simultanée ; confirmation après succès seulement ; échec
  explicite, fermeture/changement d'appel protégé contre les résultats tardifs.
- Pas de déduction hasardeuse à partir du nom d'un appareil, pas de routage simulé,
  pas de stockage des identifiants de périphérique, pas de permission micro ajoutée.
- Conversation : hauteur réellement disponible sous la navigation, recalculée
  aux changements de visualViewport (hauteur et décalage), taille et mise en page.
  Retour depuis la liste sans hériter de son défilement ; composer borné et
  défilable pour les très petites hauteurs ; safe-area existante conservée.
- Suppression des réserves de hauteur cumulées inutiles dans la liste et le thread.
  La liste conserve son espace de défilement sous le lecteur et la navigation.
- Versionnement du correctif nginx `/rtc/v1` déjà appliqué, ainsi que ses smokes.
  Aucune nouvelle modification nginx/DNS/NAT dans cette livraison applicative.

## Limite haut-parleur sur le Web

Chrome Android ne prend pas en charge `HTMLMediaElement.setSinkId` à la date du
contrôle. Le site ne peut donc pas promettre un interrupteur écouteur/haut-parleur
sur ce navigateur. Le panneau le dit explicitement ; la sortie reste gérée par
le téléphone. Là où l'API est disponible, le changement de périphérique est réel.
Une prise en charge native Android serait un chantier distinct, non livré ici.

Sources : [API de sortie audio MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/setSinkId),
[compatibilité MDN](https://github.com/mdn/browser-compat-data/blob/main/api/HTMLMediaElement.json),
code de LiveKit client installé 2.22.3 (`Room.switchActiveDevice`).

## Validation locale

- TypeScript et build de production isolé (`.next-voice-preview`) : PASS.
- Suite complète : 830 tests PASS, dont les tests comportementaux supplémentaires
  (succès différé, concurrence, échec, résultat d'un ancien appel).
- Diff et index vérifiés ; scan des secrets/valeurs des environnements locaux :
  aucune correspondance dans les 15 fichiers retenus.
- Conversation authentifiée existante vérifiée sans envoyer de message ni appeler.
  Dimensions CSS mesurées : 1440×900, 1024×768, 390×844 et 844×390.
  Aucun débordement horizontal ; footer entièrement dans le viewport.
- Simulation 390×450 avec quatre lignes : footer 310–450, textarea 322–438,
  scroll de page nul. Ce n'est **pas** un test de clavier OS réel.
- À 390×844 : conversation 70–844, footer 776–844, textarea 788–832.
- Retour à la liste : navigation/lecteur réapparaissent, réserve basse présente.
  Console du navigateur de contrôle sans nouvelle erreur ni avertissement.
- Brouillon temporaire effacé ; aucun contenu utilisateur envoyé ou supprimé.
- La sélection d'un périphérique physique et le clavier Android/Gboard restent
  à retester par l'utilisateur. NVDA réel non testé.

## Publication

Workflow canonique uniquement : commit ciblé, push de `migration/freebox-storage`,
build isolé sur l'hôte, preflight, bascule atomique et contrôle santé avec rollback.
Les modifications natives préexistantes, anciennes notes hors périmètre, fichiers
temporaires, captures, environnements et secrets restent exclus du commit.
Les résultats effectifs de déploiement sont rapportés après vérification de
`current` et `last-successful-sha`, du smoke authentifié et de la signalisation.
