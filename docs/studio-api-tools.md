# Studio IA par API

## Statut au 8 octobre 2026

Candidate locale, non déployée. Après les captures et le retour du propriétaire, le travail porte sur le fonctionnement du Studio, pas seulement son apparence : actions contextuelles, composition conservée, versions liées et suivi commun. Les quinze nouveaux parcours API restent désactivés par défaut ; la migration de suivi n’est pas appliquée à la base de production. La génération et le remix existants conservent leurs tarifs.

Périmètre choisi : outils accessibles via SunoAPI, pas un logiciel de montage multipiste. Ce lot ne constitue pas encore une parité complète avec toutes les fonctions de Suno.

## Parcours ajoutés

Depuis `/studio`, ouvrir les options d’un morceau : **Remixer**, **Modifier**, **Télécharger & séparer**. Choisir une action ouvre son éditeur dans la colonne de composition, avec la source, le titre, le style, les paroles et le modèle autorisé préremplis. Sur mobile, l’éditeur s’ouvre au-dessus de la collection et la navigation rejoint son titre. Les détails, droits et confirmations sensibles conservent le dialogue accessible existant. Aucun second lecteur audio n’est créé.

## Fonctionnement revu après les captures Suno

- La composition initiale reste montée lorsqu’on travaille dans un outil. Revenir à la composition retrouve les champs. Réutiliser/remixer un autre morceau demande confirmation avant de remplacer un brouillon non vide.
- Les réglages de chaque couple outil/source sont conservés en mémoire pendant la session du Studio, même après consultation d’un autre outil. Cette conservation ne prétend pas sauvegarder ces nouveaux brouillons après fermeture de l’onglet ; le mécanisme de récupération du formulaire principal reste inchangé.
- La collection propose dossiers existants, sans dossier, recherche insensible aux accents, filtres privé/public/favoris/voix/instrumental/corbeille, tri chronologique/titre/favoris et vues liste/grille. Les dossiers sont les métadonnées déjà persistées, pas de faux projets locaux. Aucun dossier vide autonome n’est créé.
- Les versions sont regroupées par identifiant de génération et par relations source explicites. Deux titres identiques ne sont jamais liés automatiquement. Les nouvelles transformations gardent leur source et héritent de son dossier, modifiable avant lancement. Les anciens liens qui n’ont jamais été enregistrés ne sont pas inventés.
- Un seul suivi authentifié vit au niveau du Studio, indépendamment de l’ouverture de l’éditeur. Il tourne entre les demandes actives, ignore les réponses périmées, s’interrompt quand l’onglet est masqué et reprend au retour. Une nouvelle version terminée actualise la collection et les crédits. La navigation hors du Studio ne maintient pas ce polling client ; la tâche serveur reste persistée et se retrouve au retour.
- **Activité** rassemble traitements, erreurs, crédits restitués, résultats et exports. « Retrouver dans mes morceaux » revient à la collection sans lecture automatique ni maintien d’un filtre qui masque le résultat. Les stems proposés au MIDI sont limités à la source choisie.
- Les originaux restent intacts. Une requête de transformation n’est pas un remplacement destructif, et une réponse lente ne relance pas automatiquement un traitement payant.

Ce travail n’est pas une déclaration de parité complète avec Suno. Les captures comprennent aussi rogner/retirer une section, vitesse, reverse, fondus, remaster, importations autonomes, collaboration et options de diffusion. Leurs parcours ne sont pas ajoutés comme boutons factices : les fonctions sans raccordement vérifié restent à réaliser. La création initiale utilise encore le contrat existant, notamment son titre requis en mode avancé. L’enregistrement dans un dossier avant lancement est pour l’instant offert aux nouvelles transformations, pas à la génération historique.

| Groupe | Outils raccordés au service de tâches |
| --- | --- |
| Transformer | Prolonger, remplacer un passage, ajouter une voix, accompagner une voix, mashup de deux morceaux |
| Imaginer | Boucles et effets, affiner un style, Persona musicale, propositions de pochettes |
| Exporter | Voix/instrumental, pistes séparées, instrument ciblé, WAV, transcription MIDI, récupération audio |

Les sources sont les créations IA du compte, hors corbeille. Les identifiants Suno et les URLs sont résolus côté serveur. Les nouvelles générations sont privées et ne remplacent jamais l’original. Les morceaux issus d’un remix soumis à des droits hérités sont refusés pour une nouvelle transformation ou Persona : ils conservent leur parcours de remix existant.

Le réglage **Variété des versions** est également transmis par la génération et le remix existants : valeurs entières de 0 à 4. Free conserve V6 Mini ; toutes les formules payantes conservent les trois modèles V6.

Le MIDI est une transcription des notes retournées par le fournisseur, exportée dans un fichier MIDI standard. Il nécessite d’abord une séparation terminée appartenant au même compte. Ce n’est pas une partition originale ni un résultat garanti exact.

## Suivi et facturation

La table `studio_tool_jobs` enregistre la demande avant l’appel fournisseur. Une clé unique par compte évite les doubles débits d’une même demande. Réservation et débit sont dans une transaction courte ; le réseau et la copie des médias restent hors transaction, conformément aux recommandations PostgreSQL utilisées pour cette intégration.

Les callbacks sont signés pour chaque tâche. Une réponse reçue avant la fin du POST peut être rattachée ; son contenu ne suffit pas à publier un résultat : le serveur consulte le statut authentifié du fournisseur. Les transitions terminales et remboursements sont verrouillés en base. Une réponse perdue, un timeout ou un 500 ne déclenche ni nouvelle soumission automatique ni remboursement aveugle.

Les tâches peuvent être retrouvées après rechargement. Les demandes incertaines restent visibles et nécessitent une réconciliation ; aucune interface d’administration de réconciliation manuelle n’est encore ajoutée. Les identifiants fournisseur, clés et URLs de callback ne sont pas exposés dans les réponses de l’atelier.

Les nouvelles musiques utilisent la copie durable existante, pochette comprise. Une copie non confirmée est signalée. Les exports séparés et les propositions de pochettes restent des liens fournisseur temporaires, avec un avertissement de téléchargement. SunoAPI indique une disponibilité de 14 jours pour les stems ; leur archivage durable automatique n’est pas inclus dans ce lot. [Contrat des stems](https://docs.sunoapi.org/suno-api/separate-vocals-from-music).

Cette nouvelle garantie d’idempotence concerne les nouvelles tâches de l’atelier. Elle ne prétend pas remplacer rétroactivement la facturation des anciens endpoints de génération/remix/vidéo.

## Tarifs du Studio

La politique `accessible-v1` conserve l’échelle des crédits existants : génération et remix à 12, petits outils à 1, Personas et pochettes sans crédit. Elle ne change ni les soldes, ni les abonnements, ni les recharges, ni les récompenses. Le catalogue est centralisé dans `lib/studio/pricing.ts`. Son activation reste une étape distincte du déploiement.

Les coûts ci-dessous viennent de la [facturation SunoAPI](https://sunoapi.org/billing) consultée le 9 octobre 2026. Un crédit fournisseur vaut 0,005 USD au tarif sans bonus de volume. Ce ne sont ni des crédits du site grand public Suno, ni des crédits Synaura.

| Action | Crédits Synaura par demande | Crédits fournisseur par appel |
| --- | ---: | --- |
| Prolonger, ajouter une voix ou un accompagnement | 12 chacun | 12 chacun, lignes génériques du fournisseur |
| Remplacer un passage | 6 | 5 |
| Affiner le style | 1 | 0,4 |
| Persona musicale | 0 | 0 |
| Voix et instrumental | 10 | 10 |
| Séparation complète | 50 | 50 |
| Instrument ciblé | 20 | 20 |
| WAV | 1 | 0,4 |
| Propositions de pochettes | 0 | 0 |
| Mashup, boucles et effets, MIDI, récupération | Non activés | Coûts actuels non confirmés |

Les valeurs de travail des quatre outils non activés ne constituent pas des tarifs disponibles. Le prix des sons n’est affiché que pour V5 chez le fournisseur ; il ne valide pas le parcours V6. Les six générations V6 consultées dans les journaux ont coûté 12 crédits fournisseur chacune, mais les variantes Mini et Wild restent à vérifier individuellement. Aucun prix n’est présenté comme « moins cher que Suno » sans comparaison équivalente.

Le coût est affiché dès le catalogue, puis à la confirmation, pour tous les résultats d’une même demande. Le serveur refuse un nouveau débit si le tarif a changé depuis la confirmation. Une relance explicitement demandée est une nouvelle opération ; retrouver un résultat existant ne crée aucun débit. Le MIDI indique aussi le coût distinct de la séparation préalable. Les échecs confirmés sont remboursés une seule fois ; les états incertains doivent être réconciliés.

Le scénario reproductible `node --experimental-strip-types scripts/audit-studio-pricing.mjs` compare les formules et recharges, avec consommation à 50 % et 100 %, et avec ou sans 50 crédits de récompense. Il suppose 1 USD = 1 EUR et une réserve de 20 % : ce sont des hypothèses de résistance, pas un taux de change ni des frais fiscaux constatés. Pro annuel consommé entièrement en génération V6 représente 12 EUR de fournisseur pour 11,99 EUR de revenu mensuel équivalent, avant même la réserve. Les crédits non consommés restent une obligation future ; ils ne sont pas assimilés à un bénéfice. Cette échelle attractive n’est donc pas une garantie de rentabilité : coûts réels, usage et récompenses doivent être suivis.

La génération/remix actuelle reste à 12 crédits ; les paroles restent au tarif actuel ; la vidéo de couverture existante reste à 100 crédits. Aucune formule, recharge ni dotation n’est modifiée.

## Conditions avant activation

1. Confirmer les coûts manquants avant d’ajouter les outils concernés ; vérifier le coût de chaque variante de modèle et les limites de financement des récompenses.
2. Autoriser et appliquer la migration `20261008220000_studio_tool_jobs.sql` via le processus canonique. Elle ne modifie aucun morceau ni solde existant.
3. Configurer explicitement `STUDIO_TOOLS_ENABLED=true` et `STUDIO_TOOLS_PRICING_POLICY=accessible-v1` pour les onze tarifs retenus. `STUDIO_TOOLS_APPROVED_PRICES_JSON`, s’il est présent, remplace entièrement cette politique : contrôler toute ancienne valeur avant activation. Une valeur invalide ne déclenche aucun repli permissif. Les quatre coûts inconnus sont exclus de la politique.
4. Effectuer des essais fournisseur payants autorisés, avec le callback réellement joignable, puis vérifier les fichiers audio, images, stems et MIDI obtenus.
5. Valider le rendu et le clavier sur téléphone réel. La validation responsive desktop ne remplace pas cet essai.

Rollback applicatif : désactiver les nouveaux départs, conserver la table, les callbacks et la réconciliation des tâches déjà débitées. Ne pas supprimer les historiques ou restituer tous les crédits sans examiner leurs états.

## Fonctions encore à terminer

- **Suno Voice** : parcours de vérification de sa propre voix, phrase à enregistrer, consentement, gestion et réutilisation de la voix vérifiée. Le fournisseur le documente ; ce n’est pas implémenté dans ce lot et une Persona musicale ne doit pas être présentée comme équivalente. [Suno Voice](https://docs.sunoapi.org/suno-api/suno-voice-generate).
- Références multiples image/vidéo/audio pour la génération simple. Les paramètres apparaissent dans le contrat actuel, mais leur import, propriété, limites et interface ne sont pas encore intégrés.
- Réutilisation d’une Persona dans une création de zéro : cette candidate la propose dans les transformations ; pas encore dans le formulaire de génération initiale.
- Sources uploadées externes pour les nouveaux outils : le remix existant garde son import, l’atelier utilise pour l’instant la collection IA possédée. Pas d’URL libre ajoutée.
- Historique paginé au-delà des 50 tâches les plus récentes et archivage durable des exports séparés.
- Tests réels payants des nouveaux endpoints : NON EXÉCUTÉS. Leurs adaptateurs sont vérifiés sur contrats et réponses simulées, pas certifiés par une génération réelle.

Le DAW Suno Studio 2.0 (multipiste, MIDI éditable, synthèse, effets) est hors périmètre à la demande du propriétaire. Les fonctions produit sans contrat correspondant confirmé, comme certains modes ou modèles personnalisés, ne sont pas affichées comme opérationnelles. [Studio 2.0](https://help.suno.com/en/articles/13670529), [index SunoAPI](https://docs.sunoapi.org/llms.txt).

## Validation locale

- 20 tests ciblés Studio (catalogue, contrats, limites, résultats, sécurité URL, MIDI, dossiers JSONB/texte, lignées, filtres, réponses périmées, préservation des handlers) : PASS. Les 17 tests du système d’indications produit ont également été rejoués : PASS.
- 10 scénarios PostgreSQL sur une base jetable : PASS. Concurrence de huit départs, unicité débit/fournisseur, isolation propriétaire, limites, modèle Free, publication privée, doublons de résultats, remboursement unique, timeout, callback précoce, solde insuffisant. Aucun vrai appel fournisseur ; base jetable retirée après test.
- Suite générale après la reprise du fonctionnement : 1 222 tests, 1 216 PASS, 6 échecs historiques inchangés. Ils concernent les empreintes de `forgot-password` (quatre imports), `NotificationCenter` et `messages/.../seen`, pas l’atelier. La suite n’est donc pas annoncée entièrement verte. Une régression locale sur l’intégration de ProductHint a été corrigée, puis sa suite et la suite complète ont été rejouées.
- TypeScript : PASS. Le build production local du premier atelier a passé, mais précède cette reprise du fonctionnement ; il ne valide pas ces nouveaux composants. Ne pas le présenter comme un build final de cette candidate.
- Captures et contrôles de largeur à 1440 et 390 pixels, champ mobile et navigation clavier dans le dialogue : contrôlés. Aucun élément audio supplémentaire dans l’aperçu. Aucun appel payant lancé depuis le navigateur.
- Compte connecté : vrais morceaux chargés, Free limité à V6 Mini, outil WAV explicitement en attente tarifaire, console sans nouvelle erreur pendant le parcours contrôlé.
- Reprise du fonctionnement : fixture sans API à 1440 et 390×844, source préremplie, retour au brouillon, confirmation de remplacement, réglage conservé à la réouverture, dossiers et liste/grille vérifiés. Aucune nouvelle erreur console observée. Captures `workflow-desktop-1440.png` et `workflow-mobile-390.png` ; téléphone et clavier OS réels non testés. Ces captures emploient des données de démonstration explicitement signalées.
- Parcours revu également contrôlé sur le compte réel : quatre morceaux existants, deux paires de versions, modèle V6 Mini autorisé, historique V4.5 conservé, formulaire de prolongement prérempli et départ bloqué par la validation tarifaire. Aucun appel payant. Capture `workflow-connected.png`.

Les captures et journaux se trouvent dans `artifacts/studio-api-completion-20261008/`. Aucun commit, push, déploiement, changement d’environnement ni migration de production pour ce chantier.
