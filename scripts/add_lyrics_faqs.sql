-- Ajouter des FAQ sur les paroles dans la table faq_items
-- À exécuter dans l'éditeur SQL de Supabase

-- FAQ 1: Comment ajouter des paroles lors de l'upload
INSERT INTO faq_items (question, answer, category, tags, order_index) 
SELECT 'Comment ajouter des paroles à ma musique lors de l''upload ?',
       'Lors de l''upload de votre musique, dans l''étape 2 ''Informations de la piste'', vous trouverez un champ ''Paroles (optionnel)''. Vous pouvez y saisir les paroles de votre musique. Ce champ est complètement optionnel et peut être rempli plus tard.',
       'upload',
       ARRAY['paroles', 'upload', 'musique', 'texte'],
       1
WHERE NOT EXISTS (SELECT 1 FROM faq_items WHERE question = 'Comment ajouter des paroles à ma musique lors de l''upload ?');

-- FAQ 2: Formats de paroles supportés
INSERT INTO faq_items (question, answer, category, tags, order_index) 
SELECT 'Quels formats de paroles sont supportés dans le player ?',
       'Le player supporte deux formats de paroles :

1. **Paroles LRC avec timestamps** : Format [mm:ss.ms] pour une synchronisation précise
   Exemple : [00:12.50]Première ligne des paroles

2. **Paroles simples** : Texte brut sans timestamps, synchronisé automatiquement sur la durée de la musique',
       'player',
       ARRAY['paroles', 'player', 'synchronisation', 'format', 'LRC'],
       2
WHERE NOT EXISTS (SELECT 1 FROM faq_items WHERE question = 'Quels formats de paroles sont supportés dans le player ?');

-- FAQ 3: Synchronisation dans le TikTokPlayer
INSERT INTO faq_items (question, answer, category, tags, order_index) 
SELECT 'Comment fonctionne la synchronisation des paroles dans le TikTokPlayer ?',
       'Le TikTokPlayer synchronise automatiquement les paroles avec la musique :

- **Paroles LRC** : Synchronisation précise avec les timestamps [mm:ss.ms]
- **Paroles simples** : Distribution automatique sur la durée totale de la musique
- **Affichage desktop** : Panneau latéral avec scroll automatique vers la ligne active
- **Affichage mobile** : Bottom sheet accessible via le bouton ''Paroles''',
       'player',
       ARRAY['paroles', 'synchronisation', 'tiktok-player', 'desktop', 'mobile'],
       3
WHERE NOT EXISTS (SELECT 1 FROM faq_items WHERE question = 'Comment fonctionne la synchronisation des paroles dans le TikTokPlayer ?');

-- FAQ 4: Modification des paroles
INSERT INTO faq_items (question, answer, category, tags, order_index) 
SELECT 'Puis-je modifier les paroles après l''upload ?',
       'Actuellement, les paroles sont ajoutées uniquement lors de l''upload. Cette fonctionnalité sera disponible dans une future mise à jour pour permettre la modification des paroles après publication.',
       'upload',
       ARRAY['paroles', 'modification', 'édition', 'upload'],
       4
WHERE NOT EXISTS (SELECT 1 FROM faq_items WHERE question = 'Puis-je modifier les paroles après l''upload ?');

-- FAQ 5: Visibilité des paroles
INSERT INTO faq_items (question, answer, category, tags, order_index) 
SELECT 'Les paroles sont-elles visibles par tous les utilisateurs ?',
       'Oui, les paroles sont publiques et visibles par tous les utilisateurs qui écoutent votre musique dans le TikTokPlayer. Elles apparaissent automatiquement si elles ont été ajoutées lors de l''upload.',
       'general',
       ARRAY['paroles', 'visibilité', 'public', 'partage'],
       5
WHERE NOT EXISTS (SELECT 1 FROM faq_items WHERE question = 'Les paroles sont-elles visibles par tous les utilisateurs ?');

-- FAQ 6: Création de paroles LRC
INSERT INTO faq_items (question, answer, category, tags, order_index) 
SELECT 'Comment créer des paroles LRC avec timestamps ?',
       'Pour créer des paroles LRC synchronisées :

1. **Format** : [mm:ss.ms] où mm = minutes, ss = secondes, ms = millisecondes
2. **Exemple** : [00:12.50]Première ligne
3. **Outils recommandés** : LRC Editor, ou éditeurs de texte avec calculs manuels
4. **Précision** : Les timestamps doivent correspondre exactement aux moments dans la musique',
       'technique',
       ARRAY['paroles', 'LRC', 'timestamps', 'synchronisation', 'format'],
       6
WHERE NOT EXISTS (SELECT 1 FROM faq_items WHERE question = 'Comment créer des paroles LRC avec timestamps ?');

-- FAQ 7: Dépannage des paroles
INSERT INTO faq_items (question, answer, category, tags, order_index) 
SELECT 'Pourquoi mes paroles ne s''affichent pas dans le player ?',
       'Si vos paroles ne s''affichent pas, vérifiez :

1. **Ajout lors de l''upload** : Les paroles ont été saisies dans l''étape 2
2. **Format correct** : Paroles LRC ou texte simple valide
3. **Actualisation** : Rechargez la page après l''upload
4. **Support** : Le TikTokPlayer doit être ouvert pour voir les paroles

Si le problème persiste, contactez le support.',
       'technique',
       ARRAY['paroles', 'problème', 'affichage', 'dépannage', 'support'],
       7
WHERE NOT EXISTS (SELECT 1 FROM faq_items WHERE question = 'Pourquoi mes paroles ne s''affichent pas dans le player ?');

-- FAQ 8: Limites de caractères
INSERT INTO faq_items (question, answer, category, tags, order_index) 
SELECT 'Y a-t-il une limite de caractères pour les paroles ?',
       'Il n''y a pas de limite stricte de caractères pour les paroles, mais nous recommandons :

- **Paroles simples** : Maximum 2000 caractères pour une bonne lisibilité
- **Paroles LRC** : Maximum 5000 caractères pour éviter les problèmes de performance
- **Optimisation** : Des paroles trop longues peuvent ralentir le chargement du player',
       'technique',
       ARRAY['paroles', 'limite', 'caractères', 'performance', 'optimisation'],
       8
WHERE NOT EXISTS (SELECT 1 FROM faq_items WHERE question = 'Y a-t-il une limite de caractères pour les paroles ?');

-- Vérifier que les FAQ ont été ajoutées
SELECT question, category, tags FROM faq_items 
WHERE tags @> ARRAY['paroles'] 
ORDER BY order_index;
