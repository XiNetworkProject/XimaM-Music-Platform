ALTER TABLE creator_posts
  ADD COLUMN IF NOT EXISTS original_post_id UUID REFERENCES creator_posts(id) ON DELETE SET NULL;

ALTER TABLE creator_posts
  ADD COLUMN IF NOT EXISTS include_original_track BOOLEAN DEFAULT true;

ALTER TABLE creator_posts
  DROP CONSTRAINT IF EXISTS creator_posts_post_type_check;

ALTER TABLE creator_posts
  ADD CONSTRAINT creator_posts_post_type_check
  CHECK (post_type IN ('text', 'photo', 'track_share', 'repost'));

CREATE INDEX IF NOT EXISTS idx_creator_posts_original_post ON creator_posts(original_post_id);
