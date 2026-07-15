alter table public.recommendation_impressions
  drop constraint if exists recommendation_impressions_content_type_check;

alter table public.recommendation_impressions
  add constraint recommendation_impressions_content_type_check
  check (content_type = any (array['track'::text, 'post'::text, 'clip'::text]));
