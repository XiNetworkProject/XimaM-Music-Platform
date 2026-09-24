# Messagerie — candidate locale

Date : 24 septembre 2026. Pas de commit, push, déploiement ni migration appliquée.

> État historique de la passe locale. La publication web complète a ensuite été
> autorisée explicitement ; voir [le lot de publication](release-messaging-20260924.md).
> Les réserves audio réel/mobile ci-dessous restent ouvertes, elles ne sont pas
> transformées en validations par la publication.

## Périmètre

Refonte de `/messages` et `/messages/[conversationId]`, conservation du modèle PostgreSQL existant et de la session musicale. Les applications natives ne sont pas modifiées. Le lecteur, le Studio et les profils déjà présents dans le worktree restent des changements distincts.

### Parcours disponibles dans la candidate

- Accès Messages dans la navigation desktop/tablette/mobile, en plus du raccourci existant en haut.
- Boîte de réception : Discussions / Demandes / Amis, filtres Toutes / Non lues / Groupes.
- Recherche de personnes par nom/pseudo, résolution de la relation réelle, demande avec note facultative, ouverture des amis existants. Aucune demande envoyée automatiquement par la recherche.
- Demandes de non-amis séparées ; accepter crée l’amitié et la conversation via le contrat existant. Refus et annulation conservés.
- « Ajouter en ami » explicite sur les profils.
- Création de groupes dès l’accueil, explication si moins de deux amis ; gestion existante des participants, rôles et salons texte/vocaux enregistrés conservée. Maximum existant : 24 personnes.
- Réglage des nouvelles demandes : tout le monde / comptes suivis / aucune. Sauvegarde dans les préférences existantes, sans changement automatique.
- Palette directement accessible dans les conversations : surnom personnel, couleurs et fonds existants avec aperçu. Dialogues principaux de personnalisation et création de salon réutilisent l’overlay accessible partagé.
- Recherche et partage de sons publics depuis le composer ; choix puis envoi explicite. Les titres partagés disposent d’une lecture sur l’AudioCore existant, distincte du lien vers la fiche.
- Vocaux : clic pour commencer, arrêt, préécoute, annulation, envoi ; deux minutes maximum ; formats webm/mp4/ogg selon le navigateur ; progression réelle, pause/reprise et vitesse 1×/1,5×/2×.

## Corrections de fiabilité

- Ne pas effacer l’enregistrement après un échec d’envoi.
- Conserver le média et le même identifiant lors d’une nouvelle tentative du même vocal : une réponse perdue ne prouve pas l’échec de l’écriture. Ne pas supprimer automatiquement le fichier potentiellement déjà utilisé ; un upload abandonné peut donc rester orphelin et nécessite un nettoyage vérifié distinct.
- Confirmations de retrait/blocage et fenêtres de groupe dans l’overlay partagé : empilement, focus clavier et fermeture cohérents.
- Arrêter les pistes micro et libérer les objets temporaires en quittant la conversation.
- Un seul vocal/préécoute à la fois, coordination avec AudioCore sans modifier son moteur.
- Annuler/ignorer les réponses obsolètes au changement de salon et réinitialiser la page au changement de conversation.
- Brouillon séparé par salon pendant la session ; bloquer le changement pendant l’enregistrement ou l’envoi.
- Identifiant client stable pour réessayer le même texte après un échec, verrou d’envoi pour éviter les doubles clics.
- Composition de texte multi-ligne sur mobile et respect de la composition IME.
- Erreurs de chargement visibles, plutôt qu’une fausse boîte vide silencieuse.
- Contrôles d’amitié, blocage et appartenance qui échouent de manière fermée en cas d’erreur DB, conformément au principe du moindre privilège du guide PostgreSQL utilisé.
- Métadonnées des morceaux partagés obtenues côté serveur, vérification de leur visibilité publique (classiques et IA). Ne pas naviguer vers une URL arbitraire fournie dans les métadonnées historiques.
- Cohérence groupe/direct : un blocage avec le premier membre ne désactive plus aléatoirement toute une conversation de groupe alors que POST l’autorisait.

## Appels privés et groupes : intégration candidate / non activés

Choix utilisateur : appels privés et groupes d’abord, pas de serveurs communautaires persistants.

Choix d’hébergement confirmé le 24 septembre 2026 : solution sans abonnement fournisseur, **LiveKit auto-hébergé** sur l’infrastructure Synaura, sous réserve de validation réseau et capacité. Intégration et audit read-only : [plan vocal auto-hébergé](messaging-calls-self-hosted.md). Aucun compte LiveKit Cloud ni service facturable créé.

L’intégration candidate ajoute un service de signalisation distinct, le transport LiveKit et un panneau global d’appel. Elle n’utilise pas les événements PostgreSQL typing/recording/presence pour transporter l’audio ou les appels. Aucun schéma DB modifié. Le service et les accès WAN ne sont pas installés/configurés en production ; le bouton d’appel reste masqué quand les flags/secrets requis ne sont pas configurés.

Code ajouté : invitation visuelle et acceptation/refus, vérification des membres/amitié/blocages, jetons microphone limités à la salle, micro explicite, sourdine, raccrochage, panneau réduit pendant navigation, participants actifs et coordination AudioCore. Restent à valider : UI en appel réel, voix inter-appareils, clavier/mobile, cas réseau et TURN. Aucune ouverture de port ni modification du serveur de production ; pas de faux appel simulé présenté comme fonctionnel.

Référence d’infrastructure consultée : https://docs.livekit.io/transport/self-hosting/ (service média, TLS et configuration TURN pour production).

## Validation et limites

- L’aperçu local utilise les données réelles via le workflow existant. Aucun message, demande d’ami, groupe ou vocal de test envoyé à un utilisateur existant.
- Le compte de revue est vide côté messagerie : vérification visuelle de l’accueil et des interfaces de recherche/confidentialité possible, mais pas une validation de bout en bout des conversations.
- Tests ciblés sans base : `tests/messaging-experience.test.mjs` (helpers et garde-fous de source, pas une preuve de fonctionnement réseau).
- Résultats locaux : 8/8 tests ciblés PASS ; `npx tsc --noEmit --incremental false` PASS ; `git diff --check` sur le périmètre messagerie/navigation PASS. Pas de build ni de suite complète exécutés pour cette passe locale.
- Revue navigateur desktop : accueil, recherche « ximam », sélection du profil et formulaire non envoyé, lecture des préférences sans sauvegarde, ouverture du formulaire de groupe sans création. Les données affichées sont réelles ; aucune conversation de démonstration n’a été injectée.
- Réserves : échange E2E entre comptes dédiés, enregistrement réel Android/iOS, clavier OS, lecture/upload SSD, cycle de vie complet des groupes, revue sur conversation réelle et appels multi-appareils.
- La candidate ne doit pas être décrite comme « 100 % opérationnelle » et n’est pas prête à être publiée sans ces validations.
