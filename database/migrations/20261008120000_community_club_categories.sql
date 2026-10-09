-- Allow real club categories for NEW publications; never reclassify historical rows.
-- Preconditions: baseline forum_posts_category_check and forum_posts table exist.
-- Volume: metadata + validation scan (10 posts at audit); short ACCESS EXCLUSIVE lock.
-- Canonical runner wraps transaction and checksum. Abort promptly if lock unavailable.
-- Verify read-only: pg_get_constraintdef + GROUP BY category before/after (unchanged).
-- Rollback application only; keep the superset constraint once new categories are used.
SET LOCAL lock_timeout = '3s';
ALTER TABLE public.forum_posts DROP CONSTRAINT forum_posts_category_check;
ALTER TABLE public.forum_posts ADD CONSTRAINT forum_posts_category_check CHECK (
  category IN ('question', 'suggestion', 'bug', 'general', 'feedback', 'collab',
    'remix', 'prompts', 'weekly-top', 'ai_prompt', 'top_tracks', 'announcement')
);
