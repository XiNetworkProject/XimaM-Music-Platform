-- Défis musicaux V1 — verrouillage RLS (suite à create_music_challenges.sql)
-- Execute in Supabase SQL editor. Additif, ne touche à aucune donnée existante.
--
-- But : rendre impossible tout contournement des validations de
-- POST /api/challenges/[id]/participate via un insert/update/delete Supabase
-- direct depuis un client (anon ou authenticated). Après ce script, les deux
-- tables ne sont lisibles/écrivibles que par le rôle service (supabaseAdmin),
-- déjà le seul chemin utilisé par lib/musicChallenges.ts.

-- ── music_challenges ────────────────────────────────────────────
-- Lecture publique restreinte aux défis déjà commencés (actifs ou terminés) :
-- un défi "upcoming" (starts_at futur) reste invisible à toute lecture directe
-- anon/authenticated. L'API (/api/challenges, page /challenges/[id]) continue
-- de fonctionner pour les défis upcoming car elle lit via supabaseAdmin
-- (rôle service, contourne RLS) — comportement applicatif inchangé.
DROP POLICY IF EXISTS "Music challenges are public" ON public.music_challenges;
CREATE POLICY "Music challenges are public" ON public.music_challenges
FOR SELECT USING (starts_at <= now());

-- Aucune policy INSERT/UPDATE/DELETE pour anon/authenticated : sans policy,
-- RLS refuse par défaut ces opérations pour tout rôle autre que service_role
-- (qui bypass RLS). Un utilisateur standard ne peut donc jamais modifier
-- starts_at, ends_at, source_track_id, content_type ou tout autre champ.

-- ── challenge_entries ───────────────────────────────────────────
-- Retrait de la lecture publique brute : les entrées ne doivent être exposées
-- qu'après revalidation du contenu source (Clip/Variation/Track toujours
-- publié) faite par resolveEntryContent() côté serveur. Une lecture directe
-- via l'API PostgREST exposerait des entrées dont le contenu est redevenu
-- privé/pending/rejected, que l'API masque volontairement.
DROP POLICY IF EXISTS "Challenge entries are readable" ON public.challenge_entries;

-- Retrait de la policy d'insertion "auth.uid() = user_id" : elle permettait à
-- n'importe quel utilisateur connecté d'insérer une ligne directement via le
-- SDK Supabase, en contournant entièrement les validations de
-- POST /api/challenges/[id]/participate (défi actif, type de contenu
-- compatible, propriété réelle, contenu publié). Toute participation doit
-- désormais passer par cet endpoint, qui écrit via supabaseAdmin (rôle
-- service, contourne RLS après validation complète).
DROP POLICY IF EXISTS "Users create their challenge entries" ON public.challenge_entries;

-- Aucune policy SELECT/INSERT/UPDATE/DELETE ne subsiste pour anon/authenticated
-- sur challenge_entries : la table n'est accessible qu'au rôle service.
