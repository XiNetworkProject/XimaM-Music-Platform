import type { AnalyticsPeriod, AnalyticsFormat } from "./model";

/** One read-only snapshot; aggregate in PostgreSQL, never ship listener identities.
 * Dates and ownership are parameters. No schema change or raw-event row cap.
 */
export function creatorAnalyticsStatement(
  userId: string,
  period: AnalyticsPeriod,
  format: AnalyticsFormat,
  track: string | null
) {
  return {
    values: [
      userId,
      period.previousStart,
      period.start,
      period.end,
      period.now,
      format,
      track,
    ],
    text: `
WITH owned AS MATERIALIZED (
  SELECT id, id AS raw_id, title, cover_url AS cover, created_at, 'track'::text AS kind FROM tracks WHERE creator_id = $1::uuid OR user_id = $1::uuid
  UNION ALL
  SELECT 'ai-' || t.id::text, t.id::text, t.title, t.image_url, t.created_at, 'ai' FROM ai_tracks t JOIN ai_generations g ON g.id = t.generation_id WHERE g.user_id = $1::uuid
), chosen AS MATERIALIZED (
  SELECT * FROM owned WHERE ($6::text = 'all' OR kind = $6) AND ($7::text IS NULL OR id = $7 OR (kind = 'ai' AND raw_id = $7 AND NOT EXISTS (SELECT 1 FROM owned exact WHERE exact.id = $7)))
), events AS MATERIALIZED (
  SELECT e.id, o.id AS content_id, e.created_at, (e.created_at AT TIME ZONE 'UTC')::date AS day,
    e.event_type::text AS event_type, e.user_id, e.session_id, e.progress_pct, e.duration_ms, e.source, e.platform, e.country, e.extra
  FROM chosen o JOIN track_events e ON ((e.track_id = o.id AND (o.kind = 'ai' OR NOT coalesce(e.is_ai_track,false))) OR (o.kind = 'ai' AND e.is_ai_track AND e.track_id = o.raw_id))
  WHERE ((e.created_at >= $2::timestamptz AND e.created_at < $4::timestamptz)
    OR (e.created_at >= date_trunc('hour', $5::timestamptz AT TIME ZONE 'UTC') AT TIME ZONE 'UTC' - interval '47 hours' AND e.created_at < $5::timestamptz))
    AND e.event_type IN ('play_start','play_complete','play_progress','share','add_to_playlist')
), listens AS MATERIALIZED (
  SELECT * FROM events WHERE event_type = 'play_start'
), likes AS MATERIALIZED (
  SELECT o.id AS content_id, l.created_at, (l.created_at AT TIME ZONE 'UTC')::date AS day FROM chosen o JOIN track_likes l ON o.kind = 'track' AND l.track_id = o.raw_id WHERE l.created_at >= $2::timestamptz AND l.created_at < $4::timestamptz
  UNION ALL
  SELECT o.id, l.created_at, (l.created_at AT TIME ZONE 'UTC')::date FROM chosen o JOIN ai_track_likes l ON o.kind = 'ai' AND l.track_id::text = o.raw_id WHERE l.created_at >= $2::timestamptz AND l.created_at < $4::timestamptz
), sessions AS MATERIALIZED (
  -- Browser session ids are persistent, not per-play ids. These are explicitly
  -- daily track/session journeys, not a falsely exact per-play retention curve.
  SELECT content_id, day, bool_or(event_type = 'play_complete') AS completed,
    greatest(coalesce(max(progress_pct) FILTER (WHERE event_type = 'play_progress'),0), CASE WHEN bool_or(event_type = 'play_complete') THEN 100 ELSE 0 END) AS progress,
    coalesce(max(least(14400000,greatest(0,duration_ms))) FILTER (WHERE event_type = 'play_complete'),0) AS completed_ms
  FROM events WHERE created_at >= $2::timestamptz AND created_at < $4::timestamptz AND (nullif(session_id,'') IS NOT NULL OR user_id IS NOT NULL)
  GROUP BY content_id, day, user_id, nullif(session_id,'') HAVING bool_or(event_type = 'play_start')
), windows AS (SELECT 'current' AS label, $3::timestamptz AS start, $4::timestamptz AS finish UNION ALL SELECT 'previous', $2::timestamptz, $3::timestamptz),
totals AS (
 SELECT w.label, jsonb_build_object(
   'plays',(SELECT count(*) FROM listens WHERE created_at >= w.start AND created_at < w.finish),
   'listeners',(SELECT count(DISTINCT user_id) FROM listens WHERE created_at >= w.start AND created_at < w.finish),
   'anonymousPlays',(SELECT count(*) FROM listens WHERE user_id IS NULL AND created_at >= w.start AND created_at < w.finish),
   'likes',(SELECT count(*) FROM likes WHERE created_at >= w.start AND created_at < w.finish),
   'sessions',(SELECT count(*) FROM sessions WHERE day >= (w.start AT TIME ZONE 'UTC')::date AND day < (w.finish AT TIME ZONE 'UTC')::date),
   'completed',(SELECT count(*) FROM sessions WHERE completed AND day >= (w.start AT TIME ZONE 'UTC')::date AND day < (w.finish AT TIME ZONE 'UTC')::date),
   'completedMs',(SELECT coalesce(sum(completed_ms),0) FROM sessions WHERE day >= (w.start AT TIME ZONE 'UTC')::date AND day < (w.finish AT TIME ZONE 'UTC')::date),
   'p25',(SELECT count(*) FROM sessions WHERE progress >= 25 AND day >= (w.start AT TIME ZONE 'UTC')::date AND day < (w.finish AT TIME ZONE 'UTC')::date),
   'p50',(SELECT count(*) FROM sessions WHERE progress >= 50 AND day >= (w.start AT TIME ZONE 'UTC')::date AND day < (w.finish AT TIME ZONE 'UTC')::date),
   'p75',(SELECT count(*) FROM sessions WHERE progress >= 75 AND day >= (w.start AT TIME ZONE 'UTC')::date AND day < (w.finish AT TIME ZONE 'UTC')::date)
 ) AS value FROM windows w
), day_counts AS (
 SELECT day, count(*) AS plays, count(DISTINCT user_id) AS listeners, count(*) FILTER (WHERE user_id IS NULL) AS anonymous FROM listens WHERE created_at >= $2::timestamptz AND created_at < $4::timestamptz GROUP BY day
), session_days AS (
 SELECT day,count(*) AS sessions,count(*) FILTER (WHERE completed) AS completed, sum(completed_ms) AS ms FROM sessions GROUP BY day
), days AS (
 SELECT d::date AS date, coalesce(c.plays,0) AS plays,coalesce(c.listeners,0) AS listeners,coalesce(c.anonymous,0) AS "anonymousPlays",coalesce(l.n,0) AS likes,
 coalesce(s.sessions,0) AS sessions,coalesce(s.completed,0) AS completed,coalesce(s.ms,0) AS "completedMs",0 AS p25,0 AS p50,0 AS p75
 FROM generate_series(($2::timestamptz AT TIME ZONE 'UTC')::date, ($4::timestamptz AT TIME ZONE 'UTC')::date - 1, interval '1 day') d
 LEFT JOIN day_counts c ON c.day = d::date LEFT JOIN session_days s ON s.day=d::date LEFT JOIN (SELECT day,count(*) n FROM likes GROUP BY day) l ON l.day=d::date
), track_counts AS (
 SELECT content_id, count(*) FILTER (WHERE created_at >= $3::timestamptz AND created_at < $4::timestamptz) AS plays,
 count(*) FILTER (WHERE created_at >= $2::timestamptz AND created_at < $3::timestamptz) AS previous,
 count(DISTINCT user_id) FILTER (WHERE created_at >= $3::timestamptz AND created_at < $4::timestamptz) AS listeners FROM listens GROUP BY content_id
), ranked_tracks AS (
 SELECT o.id,o.title,o.cover,o.kind,o.created_at AS "createdAt",coalesce(c.plays,0) AS plays,coalesce(c.previous,0) AS "previousPlays",coalesce(c.listeners,0) AS listeners,
 coalesce(l.n,0) AS likes,coalesce(s.n,0) AS sessions,coalesce(s.completed,0) AS completed,coalesce(s.ms,0) AS "completedMs",0 AS "anonymousPlays",0 AS p25,0 AS p50,0 AS p75
 FROM chosen o LEFT JOIN track_counts c ON c.content_id=o.id
 LEFT JOIN (SELECT content_id,count(*) n FROM likes WHERE created_at >= $3::timestamptz GROUP BY content_id) l ON l.content_id=o.id
 LEFT JOIN (SELECT content_id,count(*) n,count(*) FILTER (WHERE completed) completed,sum(completed_ms) ms FROM sessions WHERE day >= ($3::timestamptz AT TIME ZONE 'UTC')::date GROUP BY content_id) s ON s.content_id=o.id
 ORDER BY plays DESC,o.id LIMIT 500
), current_listens AS MATERIALIZED (SELECT * FROM listens WHERE created_at >= $3::timestamptz AND created_at < $4::timestamptz),
current_people AS MATERIALIZED (SELECT user_id, count(DISTINCT day) AS days FROM current_listens WHERE user_id IS NOT NULL GROUP BY user_id),
previous_people AS MATERIALIZED (SELECT DISTINCT user_id FROM listens WHERE user_id IS NOT NULL AND created_at >= $2::timestamptz AND created_at < $3::timestamptz),
post_owned AS MATERIALIZED (SELECT id,content,image_url AS image,created_at AS "createdAt",post_type AS type FROM creator_posts WHERE creator_id=$1::uuid),
post_l AS (SELECT l.post_id,count(*) n FROM post_likes l JOIN post_owned p ON p.id=l.post_id WHERE l.created_at >= $3::timestamptz AND l.created_at < $4::timestamptz GROUP BY l.post_id),
post_c AS (SELECT l.post_id,count(*) n FROM post_comments l JOIN post_owned p ON p.id=l.post_id WHERE l.created_at >= $3::timestamptz AND l.created_at < $4::timestamptz GROUP BY l.post_id),
post_ranked AS (SELECT p.*,coalesce(l.n,0) AS likes,coalesce(c.n,0) AS comments FROM post_owned p LEFT JOIN post_l l ON l.post_id=p.id LEFT JOIN post_c c ON c.post_id=p.id ORDER BY coalesce(l.n,0)+coalesce(c.n,0) DESC,p.id LIMIT 100),
clip_owned AS MATERIALIZED (SELECT id,caption AS title,poster_url AS cover,likes_count AS likes,comments_count AS comments,created_at AS "createdAt",visibility FROM music_clips WHERE creator_id=$1::uuid),
exposures AS MATERIALIZED (
 SELECT r.*, o.id AS owned_id FROM chosen o JOIN recommendation_impressions r ON r.content_type='track' AND r.content_id=o.id
 WHERE r.created_at >= $3::timestamptz AND r.created_at < $4::timestamptz
 AND NOT EXISTS (SELECT 1 FROM unnest(r.reasons) reason WHERE reason LIKE 'event:%' AND reason <> 'event:view')
), exposed_pairs AS (
 SELECT coalesce(source,'Non renseignée') AS source, user_id, owned_id,
 bool_or(EXISTS(SELECT 1 FROM current_listens l WHERE l.content_id=e.owned_id AND l.user_id=e.user_id AND l.created_at>=e.created_at AND l.created_at<e.created_at+interval '30 minutes')) AS played
 FROM exposures e WHERE user_id IS NOT NULL GROUP BY 1,user_id,owned_id
), measured_starts AS MATERIALIZED (
 SELECT DISTINCT content_id, user_id, session_id, extra->>'playbackId' AS playback_id FROM current_listens
 WHERE extra->>'kind'='playback_measurement_v1' AND extra->>'playbackId' ~ '^[0-9a-f-]{36}$'
), measured_buckets AS (
 SELECT DISTINCT s.content_id,s.user_id,s.session_id,s.playback_id,b.value::int AS bucket
 FROM measured_starts s JOIN events e ON e.content_id=s.content_id AND e.user_id IS NOT DISTINCT FROM s.user_id AND e.session_id IS NOT DISTINCT FROM s.session_id AND e.extra->>'playbackId'=s.playback_id
 CROSS JOIN LATERAL jsonb_array_elements_text(CASE WHEN jsonb_typeof(e.extra->'heardBuckets')='array' THEN e.extra->'heardBuckets' ELSE '[]'::jsonb END) b(value)
 WHERE e.created_at >= $3::timestamptz AND e.created_at < $4::timestamptz AND e.extra->>'kind'='playback_measurement_v1' AND b.value ~ '^(1?[0-9])$'
), social_displays AS (
 SELECT r.content_type AS type,(r.created_at AT TIME ZONE 'UTC')::date AS date,count(*) AS displays
 FROM recommendation_impressions r
 WHERE r.created_at >= $3::timestamptz AND r.created_at < $4::timestamptz
 AND ((r.content_type='post' AND EXISTS(SELECT 1 FROM post_owned p WHERE p.id::text=r.content_id)) OR (r.content_type='clip' AND EXISTS(SELECT 1 FROM clip_owned c WHERE c.id::text=r.content_id)))
 AND NOT EXISTS (SELECT 1 FROM unnest(r.reasons) reason WHERE reason LIKE 'event:%' AND reason <> 'event:view')
 GROUP BY 1,2
)
SELECT jsonb_build_object(
 'selectionFound',($7::text IS NULL OR EXISTS(SELECT 1 FROM chosen)),
 'evidence',jsonb_build_object(
   'exposure',coalesce((SELECT jsonb_agg(x ORDER BY displays DESC,source) FROM (SELECT coalesce(e.source,'Non renseignée') AS source,count(*) AS displays,(SELECT count(*) FROM exposed_pairs p WHERE p.source=coalesce(e.source,'Non renseignée')) AS "identifiedPairs",(SELECT count(*) FROM exposed_pairs p WHERE p.source=coalesce(e.source,'Non renseignée') AND p.played) AS "followedByPlay" FROM exposures e GROUP BY e.source) x),'[]'::jsonb),
   'actions',jsonb_build_object('shares',(SELECT count(*) FROM events WHERE event_type='share' AND created_at >= $3::timestamptz AND created_at < $4::timestamptz),'playlistAdds',(SELECT count(*) FROM events WHERE event_type='add_to_playlist' AND created_at >= $3::timestamptz AND created_at < $4::timestamptz)),
   'retention',jsonb_build_object('plays',(SELECT count(*) FROM measured_starts),'buckets',(SELECT jsonb_agg(x ORDER BY bucket) FROM (SELECT b AS bucket,(SELECT count(*) FROM measured_buckets m WHERE m.bucket=b) AS plays FROM generate_series(0,19) b) x)),
   'social',coalesce((SELECT jsonb_agg(x ORDER BY date,type) FROM social_displays x),'[]'::jsonb)),
 'current',(SELECT value FROM totals WHERE label='current'),'previous',(SELECT value FROM totals WHERE label='previous'),
 'daily',coalesce((SELECT jsonb_agg(to_jsonb(d) ORDER BY date) FROM days d WHERE date >= ($3::timestamptz AT TIME ZONE 'UTC')::date),'[]'::jsonb),
 'previousDaily',coalesce((SELECT jsonb_agg(to_jsonb(d) ORDER BY date) FROM days d WHERE date < ($3::timestamptz AT TIME ZONE 'UTC')::date),'[]'::jsonb),
 'tracks',coalesce((SELECT jsonb_agg(to_jsonb(t) ORDER BY plays DESC,id) FROM ranked_tracks t),'[]'::jsonb),
 'trackCount',(SELECT count(*) FROM chosen),'catalogueCount',(SELECT count(*) FROM owned),
 'sources',coalesce((SELECT jsonb_agg(x ORDER BY count DESC,label) FROM (SELECT CASE WHEN source IN ('live','scroll','synaura-scroll','synaura_live') THEN 'Live' WHEN source IN ('discover','search','profile','studio','library','track','player','queue') THEN source ELSE 'Autre / non renseigné' END AS label,count(*) AS count FROM current_listens GROUP BY 1) x),'[]'::jsonb),
 'countries',coalesce((SELECT jsonb_agg(x ORDER BY count DESC,label) FROM (SELECT CASE WHEN country ~ '^[A-Za-z]{2}$' THEN upper(country) ELSE 'Non renseigné' END AS label,count(*) AS count FROM current_listens GROUP BY 1) x),'[]'::jsonb),
 'platforms',coalesce((SELECT jsonb_agg(x ORDER BY count DESC,label) FROM (SELECT CASE WHEN platform IN ('web','mobile','ios','android') THEN platform ELSE 'Non renseignée' END AS label,count(*) AS count FROM current_listens GROUP BY 1) x),'[]'::jsonb),
 'hours',coalesce((SELECT jsonb_agg(x) FROM (SELECT extract(isodow FROM created_at AT TIME ZONE 'UTC')::int-1 AS day,extract(hour FROM created_at AT TIME ZONE 'UTC')::int AS hour,count(*) AS count FROM current_listens GROUP BY 1,2) x),'[]'::jsonb),
 'recent',(SELECT jsonb_agg(x ORDER BY hour) FROM (SELECT h AS hour,count(l.id) AS count FROM generate_series(date_trunc('hour',$5::timestamptz AT TIME ZONE 'UTC') AT TIME ZONE 'UTC' - interval '47 hours',date_trunc('hour',$5::timestamptz AT TIME ZONE 'UTC') AT TIME ZONE 'UTC',interval '1 hour') h LEFT JOIN listens l ON l.created_at>=h AND l.created_at<h+interval '1 hour' GROUP BY h) x),
 'followers',(SELECT count(*) FROM user_follows WHERE following_id=$1::uuid),
 'gainedFollowers',(SELECT count(*) FROM user_follows WHERE following_id=$1::uuid AND created_at >= $3::timestamptz AND created_at < $4::timestamptz),
 'audience',jsonb_build_object(
   'returning',(SELECT count(*) FROM current_people c JOIN previous_people p USING(user_id)),
   'notSeenPreviously',(SELECT count(*) FROM current_people c WHERE NOT EXISTS (SELECT 1 FROM previous_people p WHERE p.user_id=c.user_id)),
   'multipleDays',(SELECT count(*) FROM current_people WHERE days >= 2),
   'singleDay',(SELECT count(*) FROM current_people WHERE days = 1),
   'previousListeners',(SELECT count(*) FROM previous_people)),
 'posts',coalesce((SELECT jsonb_agg(p ORDER BY likes+comments DESC,id) FROM post_ranked p),'[]'::jsonb),'postCount',(SELECT count(*) FROM post_owned),
 'postSummary',jsonb_build_object('published',(SELECT count(*) FROM post_owned WHERE "createdAt">=$3::timestamptz AND "createdAt"<$4::timestamptz),'likes',(SELECT coalesce(sum(n),0) FROM post_l),'comments',(SELECT coalesce(sum(n),0) FROM post_c)),
 'clips',coalesce((SELECT jsonb_agg(c ORDER BY "createdAt" DESC,id) FROM (SELECT * FROM clip_owned ORDER BY "createdAt" DESC,id LIMIT 100) c),'[]'::jsonb),'clipCount',(SELECT count(*) FROM clip_owned)
) AS report;`,
  };
}
