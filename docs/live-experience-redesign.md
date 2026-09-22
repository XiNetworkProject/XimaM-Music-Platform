# Live — candidate locale, 21 septembre 2026

État : non commitée, non déployée. Validation créative encore à demander.

## Direction corrigée après les retours

- Composition d’écoute ouverte ; l’itération immersive ci-dessous remplace le fond générique par la pochette et une analyse audio réelle.
- Actions sociales en symboles sans fond ni libellé visible, avec compteurs, noms accessibles, zones tactiles de 44 px minimum et focus clavier.
- Double-tap / double-clic sur le visuel pour basculer le like. Le geste déclenche le bouton existant de l’entité courante : aucun nouvel endpoint, aucune mutation audio.
- Swipe, appui long, pincement, bouton Play et interactions sur contrôles exclus du double-tap. Le cœur de confirmation attend le changement du vrai état du bouton. Observateur et timers bornés et nettoyés.
- Réactions explicites avec envol local des emojis ; pas de fausse activité publique. Animation désactivée avec la préférence d’ambiance et reduced motion.
- Entrée Live : commentaires et partage réellement ouverts en place ; identité du morceau d’entrée conservée lors du passage au fil.

## Commentaires : place réellement gagnée

- Desktop : panneau jusqu’à 760 px de large, pleine hauteur.
- Mobile : 96dvh, saisie séparée de la conversation, prise en compte de la safe area et du calcul visualViewport existant.
- Waveform réservée à l’onglet Moments dans Live ; autres origines inchangées.
- Mesure avant/après au même viewport 455 × 872 : zone de lecture de 135 px à 525 px. À 1600 × 900 : panneau de 760 px, conversation de 578 px ; Moments de 503 px pour le morceau inspecté.
- Les brouillons, l’historique, le focus, les règles de modération et les contrats Post/Clip ne sont pas remplacés.

## Vérifications effectuées

- TypeScript : PASS.
- Suite complète avant l’itération immersive : 703/703 PASS, dont reconnaissance tactile/souris/stylet, exclusion des swipes/contrôles, verrou de mutation, ajout/retrait du like et nettoyage des effets.
- Comparaison AST historique des 420 handlers et 212 appels protégés : PASS sans changer les empreintes de référence.
- Navigateur : entrée → fil conserve l’identité ; commentaires → Moments → Conversation conserve le brouillon ; fermeture restitue le focus au bouton commentaires et conserve identité/filtre.
- Brouillon créé seulement localement, jamais envoyé, puis effacé dans l’onglet QA.
- Symboles contrôlés dans le DOM : fonds transparents, libellés accessibles, aucun texte visible hors compteurs.
- Géométrie Live contrôlée à 390 × 844 sans débordement horizontal ; rendu et grand panneau contrôlés sur ordinateur.
- `git diff --check` : PASS. Recherche ciblée de formats de secrets dans les nouveaux fichiers : aucune correspondance.

## Limites et exclusions

- Aucun like/commentaire/réaction de test publié sur les contenus réels ; mutations du nouveau raccourci exercées avec doublures de tests, pas de validation tactile OS revendiquée.
- Android/Gboard et lecteur d’écran réels non testés. Clavier virtuel et très petites fenêtres restent à recontrôler manuellement.
- Build de production non rejoué sur cette itération ; le serveur local connecté reste disponible pour la revue.
- Aucun changement API, DB, implémentation AudioCore, infrastructure ou design du panneau Créer pendant ce travail Live. La barre haute commune est désormais masquée seulement sur Live ; les autres routes restent inchangées. Les modifications préexistantes hors périmètre sont conservées.

## Itération immersive — vrai signal audio, pas une waveform pré-calculée

- Barre haute Live et sélecteur remplacés par cinq petits filtres horizontaux, desktop/mobile, avec cibles tactiles de 44 px. Navigation commune haute retirée uniquement de Live ; accès aux autres espaces conservés.
- Fond : pochette réelle floutée, halo dans ses propres couleurs, léger déplacement à la souris. Aucun nouveau calcul de palette ou endpoint.
- La première approximation à partir de la waveform a été retirée après le retour utilisateur. Le pulse utilise désormais le PCM instantané (RMS) et le spectre des basses 40–190 Hz de l’audio effectivement joué : FFT 1024, attaque courte et relâchement lissé.
- Analyse latérale via `captureStream` → `MediaStreamAudioSourceNode` → `AnalyserNode`. Aucune connexion à la sortie sonore, aucun `createMediaElementSource`, aucun micro, aucun nouveau fichier audio ou second lecteur. Le code AudioCore et les handlers du feed ne sont pas modifiés.
- Démarrage après interaction, correspondance stricte avec l’entité musicale active. Pause, mute, volume nul, onglet masqué, animations désactivées ou reduced motion arrêtent l’analyse visuelle. Silence numérique = énergie nulle, pas de pulse inventé. Nettoyage des frames, sources, pistes capturées, événements et AudioContext à la sortie.
- 7 particules pendant la musique par défaut, maximum 16. Réglages distincts : quantité, vitesse, taille, lumière ; intensité et sensibilité du pulse. Leurs couleurs proviennent aussi de la pochette. Pas de rendu React par frame.
- Swipe renforcé : voile noir 420 ms par défaut, anneau coloré et 12 éclats durant 798 ms. Aucune interception ou attente ajoutée au swipe ; la décoration suit l’identité déjà validée par le feed. Réglages séparés du fondu et des particules de transition ; zéro désactive l’effet.
- Presets Doux / Immersif / Épuré et réglages locaux versionnés `synaura.live-ambience.v2`. Coûts et valeurs bornés, données stockées corrompues ignorées.

### Vérifications de cette itération

- TypeScript : PASS ; suite complète : **712/712 PASS**. Contrats historiques conservés.
- Tests supplémentaires : vrais tableaux PCM/FFT, silence, basses, variation de niveau, flux non supporté, absence de branchement aux haut-parleurs, pause, changement de source et nettoyage ; bornes des préférences, particules et remplacement des transitions rapides.
- Navigateur : analyse `listening` et énergie variable observées pendant de vrais morceaux (exemples 0,297 / 0,401 / 0,538 avec intensité 70 %). Pause vérifiée : énergie et signal à zéro, animation des particules `paused` ; reprise : retour de l’analyse.
- Quantité de particules modifiée via le slider : 7 → 8 éléments, puis réinitialisation. Animations désactivées : zéro particule, énergie zéro. Activation rétablie après contrôle.
- Transition inspectée immédiatement après Item suivant : voile 0,42 s, 12 particules et animation 0,798 s ; pas d’effet persistant.
- Desktop 1440 × 900 et mobile 390 × 844 contrôlés. Pas de débordement horizontal, morceau actif aligné, filtres 44 px ; panneau de paramètres reste dans le viewport. Échap ferme les paramètres et restitue le focus.
- Aucun like, commentaire ou réaction de test envoyé. Lecture/pause/reprise et navigation testées uniquement dans la candidate locale.
- Console : deux erreurs transitoires HMR durant le remplacement du fichier waveform supprimé ; aucune erreur d’analyse audio observée ensuite. Type-check et suite complète propres après remplacement.
- `git diff --check` : PASS. Scan ciblé de formats de secrets sur les nouveaux fichiers : aucune correspondance. Aucun staging, commit, push ou déploiement.

### Limites explicites

- `captureStream` n’est pas universellement pris en charge. L’interface annonce l’indisponibilité si nécessaire, sans fausse réaction audio et sans toucher au son. Voir [la compatibilité documentée](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/captureStream) et [le contrat de capture W3C](https://www.w3.org/TR/mediacapture-fromelement/).
- Le navigateur Chromium disponible a été exercé ; Safari/iOS, Android/Gboard physique, NVDA et mesure FPS sur appareil mobile réel non testés. Une source protégée peut fournir du silence à l’analyse : pas de contournement des protections.
- Build de production non rejoué pour laisser la candidate locale connectée disponible pendant la revue. Rien n’est publié.

## Correctif visuel — bord droit et filtres horizontaux

- Cause confirmée du fond « coupé » : `app/globals.css` impose `max-width:100%` à tous les éléments. Les couches décoratives positionnées avec des marges négatives étaient ainsi limitées à la largeur de Live et décalées vers la gauche. À 488 px, la couche de fond s’arrêtait à x=417,5 au lieu de couvrir le bord x=488.
- Exception ciblée `max-width:none` sur les trois couches volontairement débordantes (fond, aura, anneau de transition). La marge du fond dépend désormais du flou et l’image reste centrée en `object-fit:cover`. La règle globale de protection mobile n’est pas modifiée.
- Mesures après correction : à 390 px, le fond couvre environ x=-173 à x=560 ; à 1440 px, Live se termine à x=1440 et le fond dépasse x=1643. Aucun débordement horizontal du document sur les deux formats.
- Filtres : texte sans fond ni bordure, petit soulignement du choix actif, bords adoucis. Rangée horizontale native tactile/trackpad ; glisser à la souris sur desktop lorsque la rangée déborde. Un déplacement ne sélectionne pas un filtre accidentellement ; seules les activations explicites utilisent le callback existant.
- Clavier : Tab, flèches gauche/droite, Home et End révèlent les filtres ; Entrée/Espace sélectionnent. Focus visible et cibles de 44 px conservés. Aucune interception des gestes tactiles par du JavaScript ; aucun changement du swipe vertical des morceaux.
- TypeScript : PASS. Suite complète : **717/717 PASS**, dont cinq tests de ce correctif (clic, drag, annulation, tactile non intercepté, clavier et contrainte CSS). `git diff --check` : PASS.
- Vérification navigateur desktop 1440 × 900 et mobile 390 × 844. Téléphone physique non testé ; build production non rejoué. Pulse, analyse audio, particules, endpoints et contrôleur du feed inchangés. Aucun commit ni déploiement.
