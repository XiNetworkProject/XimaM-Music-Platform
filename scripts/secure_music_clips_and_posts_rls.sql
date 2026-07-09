-- Clips musicaux + fil créateurs — verrouillage RLS (suite à
-- secure_music_challenges_rls.sql, même logique appliquée à music_clips et
-- creator_posts). Exécuter dans l'éditeur SQL Supabase. Additif, ne touche à
-- aucune donnée existante.
--
-- Problème corrigé : ni "Public can read published music clips" (music_clips)
-- ni "creator_posts_select" (creator_posts) ne revalident que le morceau
-- source référencé (source_track_id / track_id) est toujours public. Un
-- Clip ou un post dont le morceau source est repassé privé restait donc
-- lisible indéfiniment via un accès direct à l'API REST Supabase (clé
-- NEXT_PUBLIC_SUPABASE_ANON_KEY), alors que la couche applicative
-- (lib/musicClips.ts formatMusicClip, lib/publicTracks.ts isTrackPublic/
-- isAiTrackPublic utilisés dans app/api/posts) masque déjà correctement ce
-- cas côté Next.js.
--
-- Toutes les lectures/écritures de ces deux tables passent déjà par des
-- routes /api/* qui utilisent supabaseAdmin (rôle service, contourne RLS) —
-- vérifié par grep sur l'ensemble du repo (web + synaura-app) avant ce
-- script. La seule exception trouvée est app/api/search/route.ts (client
-- anon) : corrigée séparément dans le même correctif pour utiliser
-- supabaseAdmin, faute de quoi la recherche de posts cesserait de fonctionner
-- après ce verrouillage. Comportement applicatif inchangé partout ailleurs.

-- ── music_clips ─────────────────────────────────────────────────
-- AVANT :
--   "Public can read published music clips" FOR SELECT USING (visibility = 'published')
--   "Creators can read own music clips"      FOR SELECT USING (auth.uid() = creator_id)
--   "Creators can insert own music clips"    FOR INSERT WITH CHECK (auth.uid() = creator_id)
--   "Creators can update own music clips"    FOR UPDATE USING/CHECK (auth.uid() = creator_id)
--   "Creators can delete own music clips"    FOR DELETE USING (auth.uid() = creator_id)
-- APRES : aucune policy anon/authenticated ne subsiste. Un insert/update
-- direct contournerait canCreateClip()/assertCanCreateAiVariation()
-- (lib/clipPermissions.ts) ; un select direct contournerait le filtre
-- source.isPublic de formatMusicClip(). Seul le rôle service (supabaseAdmin,
-- déjà l'unique chemin utilisé par app/api/music-clips/*) peut désormais
-- lire/écrire la table.
DROP POLICY IF EXISTS "Public can read published music clips" ON public.music_clips;
DROP POLICY IF EXISTS "Creators can read own music clips" ON public.music_clips;
DROP POLICY IF EXISTS "Creators can insert own music clips" ON public.music_clips;
DROP POLICY IF EXISTS "Creators can update own music clips" ON public.music_clips;
DROP POLICY IF EXISTS "Creators can delete own music clips" ON public.music_clips;

-- ── creator_posts ───────────────────────────────────────────────
-- AVANT :
--   "creator_posts_select" FOR SELECT USING (is_public = true)
--   "creator_posts_insert" FOR INSERT WITH CHECK (auth.uid() = creator_id)
--   "creator_posts_update" FOR UPDATE USING (auth.uid() = creator_id)
--   "creator_posts_delete" FOR DELETE USING (auth.uid() = creator_id)
-- APRES : aucune policy anon/authenticated ne subsiste. Un select direct
-- exposerait encore track_id pour un post "track_share" dont le morceau est
-- redevenu privé (le masquage se fait dans loadTrack(), app/api/posts/*).
-- Seul le rôle service (déjà l'unique chemin utilisé par app/api/posts/*,
-- app/api/community/posts/*) peut désormais lire/écrire la table.
DROP POLICY IF EXISTS "creator_posts_select" ON public.creator_posts;
DROP POLICY IF EXISTS "creator_posts_insert" ON public.creator_posts;
DROP POLICY IF EXISTS "creator_posts_update" ON public.creator_posts;
DROP POLICY IF EXISTS "creator_posts_delete" ON public.creator_posts;

-- post_likes / post_comments ne référencent aucun morceau et restent hors
-- périmètre de ce correctif (leurs policies actuelles — auth.uid() = user_id
-- pour l'écriture, lecture publique du compteur — ne posent pas de risque de
-- fuite de morceau privé).
