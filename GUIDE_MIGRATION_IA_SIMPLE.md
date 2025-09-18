# Guide de Migration IA - Exécution Manuelle

## Problème résolu
Le script automatique utilisait `exec_sql()` qui n'existe pas dans Supabase. Voici comment exécuter la migration manuellement.

## Étapes à suivre

### 1. Accéder à l'interface Supabase
1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet Synaura
3. Cliquez sur "SQL Editor" dans le menu de gauche

### 2. Exécuter le script complet
1. Ouvrez le fichier `scripts/create_ai_generations_direct.sql`
2. Copiez tout le contenu
3. Collez-le dans l'éditeur SQL de Supabase
4. Cliquez sur "Run" (ou Ctrl+Enter)

### 3. Vérifier la création
Après l'exécution, vérifiez que les tables sont créées :

```sql
-- Vérifier les tables créées
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'ai_%' OR table_name = 'user_quotas';

-- Vérifier les fonctions créées
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%quota%' OR routine_name LIKE '%ai%';
```

## Tables créées

✅ **ai_generations** - Générations IA des utilisateurs
✅ **ai_tracks** - Tracks individuelles générées
✅ **user_quotas** - Quotas mensuels des utilisateurs  
✅ **ai_playlists** - Playlists de musiques IA
✅ **ai_playlist_tracks** - Liaison playlists-tracks
✅ **ai_track_likes** - Likes sur les tracks IA
✅ **ai_usage_stats** - Statistiques d'utilisation

## Fonctions créées

✅ **get_user_quota_remaining()** - Obtenir le quota restant
✅ **increment_ai_usage()** - Incrémenter l'utilisation
✅ **get_user_ai_stats()** - Obtenir les statistiques
✅ **update_ai_usage_stats()** - Trigger pour les stats

## Politiques RLS

✅ Toutes les tables ont des politiques RLS configurées
✅ Les utilisateurs ne peuvent accéder qu'à leurs propres données
✅ Sécurité complète activée

## Test rapide

Après la migration, testez avec :

```sql
-- Tester la fonction de quota
SELECT get_user_quota_remaining('00000000-0000-0000-0000-000000000000');

-- Vérifier les politiques RLS
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename LIKE 'ai_%' OR tablename = 'user_quotas';
```

## Prochaines étapes

1. ✅ Migration terminée
2. 🔄 Redémarrer l'application
3. 🧪 Tester la génération IA
4. 📊 Vérifier les quotas utilisateurs

## En cas d'erreur

Si vous obtenez des erreurs :
- Vérifiez que vous êtes connecté à Supabase
- Assurez-vous d'avoir les droits d'administration
- Exécutez le script en plusieurs parties si nécessaire
- Contactez le support si les erreurs persistent

🎉 **Migration IA prête !**
