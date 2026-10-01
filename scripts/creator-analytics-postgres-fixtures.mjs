// Isolated PostgreSQL execution. Uses the existing ignored PGlite test runtime.
// No production connection, credential, environment file or user-data mutation.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { analyticsPeriod } from "../lib/creatorAnalytics/model.ts";
import { creatorAnalyticsStatement } from "../lib/creatorAnalytics/query.ts";
const require = createRequire(
  new URL("../.tmp/search-pg-validation/run.cjs", import.meta.url)
);
const { PGlite } = require("@electric-sql/pglite");
const db = new PGlite();
const owner = "00000000-0000-4000-8000-000000000001",
  outsider = "00000000-0000-4000-8000-000000000002";
const listener = "00000000-0000-4000-8000-000000000003";
const ai = "00000000-0000-4000-8000-000000000010",
  gen = "00000000-0000-4000-8000-000000000011",
  post = "00000000-0000-4000-8000-000000000012";
const period = analyticsPeriod(
  new URLSearchParams("range=7d"),
  new Date("2026-09-27T12:00:00Z")
);
const report = async (
  user = owner,
  format = "all",
  track = null,
  p = period
) => {
  const statement = creatorAnalyticsStatement(user, p, format, track);
  return (await db.query(statement.text, statement.values)).rows[0].report;
};
try {
  // Extract the actual table definitions from the versioned production baseline.
  const schema = readFileSync(
    new URL("../database/baseline/010_production_schema.sql", import.meta.url),
    "utf8"
  );
  const eventEnum = schema.match(
    /CREATE TYPE public\.track_event_type AS ENUM \([\s\S]*?\);/
  )[0];
  await db.exec(eventEnum);
  for (const table of [
    "tracks",
    "ai_generations",
    "ai_tracks",
    "track_events",
    "track_likes",
    "ai_track_likes",
    "creator_posts",
    "post_likes",
    "post_comments",
    "music_clips",
    "user_follows",
    "recommendation_impressions",
  ]) {
    const ddl = schema.match(
      new RegExp(`CREATE TABLE public\\.${table} \\([\\s\\S]*?\\n\\);`)
    );
    assert.ok(ddl, table);
    await db.exec(ddl[0]);
  }
  await db.query(
    `INSERT INTO tracks(id,title,audio_url,creator_id,is_public) VALUES ('mine','Mon son','fixture:audio',$1,false),('other','Privé étranger','fixture:audio',$2,false),('quiet','Silence','fixture:audio',$1,true)`,
    [owner, outsider]
  );
  await db.query(
    `INSERT INTO ai_generations(id,user_id,prompt) VALUES ($1,$2,'fixture')`,
    [gen, owner]
  );
  await db.query(
    `INSERT INTO ai_tracks(id,generation_id,title) VALUES ($1,$2,'Son IA')`,
    [ai, gen]
  );
  const event = async (
    track,
    at,
    type,
    user = listener,
    session = "listener-session",
    progress = null,
    isAI = false
  ) =>
    db.query(
      `INSERT INTO track_events(track_id,created_at,event_type,user_id,session_id,progress_pct,duration_ms,is_ai_track,source,platform,country) VALUES ($1,$2,$3,$4,$5,$6,180000,$7,'live','web','FR')`,
      [track, at, type, user, session, progress, isAI]
    );
  await event("mine", "2026-09-20T00:00:00Z", "play_start");
  await event(
    "mine",
    "2026-09-20T00:01:00Z",
    "play_progress",
    listener,
    "listener-session",
    50
  );
  await event(
    "mine",
    "2026-09-20T00:02:00Z",
    "play_progress",
    listener,
    "listener-session",
    50
  );
  await event("mine", "2026-09-20T00:03:00Z", "play_complete");
  await event("mine", "2026-09-20T00:04:00Z", "play_complete");
  await event("mine", "2026-09-21T00:00:00Z", "play_start");
  await event(
    "mine",
    "2026-09-21T00:02:00Z",
    "play_start",
    null,
    "anonymous-session"
  );
  await event("mine", "2026-09-21T00:03:00Z", "play_start", null, null);
  await event(
    "ai-" + ai,
    "2026-09-22T10:00:00Z",
    "play_start",
    listener,
    "ai-session",
    null,
    true
  );
  await event(
    ai,
    "2026-09-23T10:00:00Z",
    "play_start",
    listener,
    "ai-session",
    null,
    true
  );
  await event("mine", "2026-09-19T23:59:59Z", "play_start");
  await event("mine", "2026-09-27T00:00:00Z", "play_start"); // today: recent only
  await event("other", "2026-09-21T00:00:00Z", "play_start");
  await event("mine", "2026-09-29T00:00:00Z", "play_start"); // future: never
  await db.query(
    `INSERT INTO track_likes(id,track_id,user_id,created_at) VALUES (1,'mine',$1,'2026-09-22'),(2,'other',$1,'2026-09-22')`,
    [listener]
  );
  await db.query(
    `INSERT INTO ai_track_likes(track_id,user_id,created_at) VALUES ($1,$2,'2026-09-23')`,
    [ai, listener]
  );
  await db.query(
    `INSERT INTO creator_posts(id,creator_id,post_type,content,created_at) VALUES ($1,$2,'text','Ancien post','2026-08-01')`,
    [post, owner]
  );
  await db.query(
    `INSERT INTO post_likes(post_id,user_id,created_at) VALUES ($1,$2,'2026-09-23')`,
    [post, listener]
  );
  await db.query(
    `INSERT INTO post_comments(post_id,user_id,content,created_at) VALUES ($1,$2,'test','2026-09-24')`,
    [post, listener]
  );
  await db.query(
    `INSERT INTO user_follows(id,follower_id,following_id,created_at) VALUES (1,$1,$2,'2026-09-23')`,
    [listener, owner]
  );
  const r = await report();
  assert.equal(r.current.plays, 6);
  assert.equal(r.previous.plays, 1);
  assert.equal(r.current.listeners, 1);
  assert.equal(r.current.anonymousPlays, 2);
  assert.equal(r.current.likes, 2);
  assert.equal(r.current.sessions, 5);
  assert.equal(r.current.completed, 1);
  assert.equal(r.current.completedMs, 180000);
  assert.equal(r.current.p50, 1);
  assert.equal(r.current.p75, 1);
  assert.equal(r.daily.length, 7);
  assert.equal(r.previousDaily.length, 7);
  assert.equal(r.daily[0].date, "2026-09-20");
  assert.equal(r.daily[6].date, "2026-09-26");
  assert.equal(
    r.daily.reduce((n, d) => n + d.plays, 0),
    r.current.plays
  );
  assert.ok(r.daily.reduce((n, d) => n + d.listeners, 0) > r.current.listeners);
  assert.equal(
    r.tracks.reduce((n, t) => n + t.plays, 0),
    6
  );
  assert.equal(r.trackCount, 3);
  assert.equal(r.postSummary.published, 0);
  assert.equal(r.postSummary.likes, 1);
  assert.equal(r.postSummary.comments, 1);
  assert.equal(r.followers, 1);
  assert.equal(r.gainedFollowers, 1);
  assert.deepEqual(r.audience, { returning:1,notSeenPreviously:0,multipleDays:1,singleDay:0,previousListeners:1 });
  assert.equal(r.recent.length, 48);
  assert.equal(
    r.recent.reduce((n, h) => n + h.count, 0),
    1
  );
  assert.ok(!JSON.stringify(r).includes(listener));
  assert.ok(!JSON.stringify(r).includes("listener-session"));
  const onlyAI = await report(owner, "ai");
  assert.equal(onlyAI.current.plays, 2);
  assert.equal(onlyAI.current.likes, 1);
  assert.equal(onlyAI.tracks[0].id, "ai-" + ai);
  assert.equal((await report(owner, "all", "other")).selectionFound, false);
  assert.equal(
    (await report(owner, "all", "mine' OR true--")).selectionFound,
    false
  );
  assert.equal((await report(owner, "all", "mine")).current.plays, 4);
  assert.equal((await report(outsider)).current.plays, 1);
  const empty = await report("00000000-0000-4000-8000-000000000099");
  assert.equal(empty.current.plays, 0);
  assert.equal(empty.tracks.length, 0);
  assert.equal(empty.daily.length, 7);
  const custom = analyticsPeriod(
    new URLSearchParams("range=custom&from=2026-09-22&to=2026-09-23"),
    new Date(period.now)
  );
  assert.equal((await report(owner, "all", null, custom)).current.plays, 2);
  // The same raw UUID can exist in both namespaces. An AI event must not be
  // attributed to a classic song (possibly owned by somebody else).
  await db.query(
    `INSERT INTO tracks(id,title,audio_url,creator_id) VALUES ($1,'Collision classique','fixture:audio',$2)`,
    [ai, outsider]
  );
  await event(
    ai,
    "2026-09-24T10:00:00Z",
    "play_start",
    listener,
    "classic-collision",
    null,
    false
  );
  assert.equal((await report(owner, "ai")).current.plays, 2);
  assert.equal((await report(outsider, "track")).current.plays, 2);
  assert.equal((await report(owner, "all", ai)).current.plays, 2);
  assert.equal((await report(outsider, "all", ai)).current.plays, 1);
  await event('mine','2026-09-25T10:00:00Z','play_start',outsider,'another-listener');
  let audienceReport=await report();
  assert.deepEqual(audienceReport.audience, { returning:1,notSeenPreviously:1,multipleDays:1,singleDay:1,previousListeners:1 });
  await event('mine','2026-09-26T10:00:00Z','play_start',outsider,'another-listener');
  audienceReport=await report();
  assert.equal(audienceReport.audience.multipleDays,2);
  assert.equal(audienceReport.audience.returning+audienceReport.audience.notSeenPreviously,audienceReport.current.listeners);
  assert.equal((await report(owner,'ai')).audience.notSeenPreviously,1);
  assert.equal(empty.audience.returning,0);
  await db.query(`INSERT INTO recommendation_impressions(content_type,content_id,user_id,created_at,source,reasons) VALUES ('track','mine',$1,'2026-09-25T09:50:00Z','live',NULL),('track','mine',$1,'2026-09-25T09:51:00Z','live',NULL),('track','other',$1,'2026-09-25T09:50:00Z','live',NULL),('track','mine',$1,'2026-09-25T09:51:00Z','ignore',ARRAY['event:remix']),('post',$2,$1,'2026-09-25T09:50:00Z','live',NULL)`,[outsider,post]);
  const measurementId='00000000-0000-4000-8000-000000000099';
  await db.query(`INSERT INTO track_events(track_id,user_id,session_id,event_type,created_at,extra) VALUES ('mine',$1,'measured','play_start','2026-09-25T11:00:00Z',$2),('mine',$1,'measured','play_progress','2026-09-25T11:00:10Z',$3),('mine',$1,'measured','play_progress','2026-09-25T11:00:20Z',$3),('other',$1,'measured','play_progress','2026-09-25T11:00:20Z',$3)`,[listener,JSON.stringify({kind:'playback_measurement_v1',playbackId:measurementId}),JSON.stringify({kind:'playback_measurement_v1',playbackId:measurementId,heardBuckets:[0,1,1,19,99,'bad']})]);
  const evidence=(await report()).evidence;
  assert.deepEqual(evidence.exposure,[{source:'live',displays:2,identifiedPairs:1,followedByPlay:1}]);
  assert.equal(evidence.retention.plays,1);
  assert.equal(evidence.retention.buckets[0].plays,1);
  assert.equal(evidence.retention.buckets[10].plays,0);
  assert.equal(evidence.retention.buckets[19].plays,1);
  assert.equal(evidence.social[0].displays,1);
  console.log(
    "PASS: actual PostgreSQL query; production-baseline tables; owner isolation, UTC boundaries, AI aliases/likes, deduplicated audience/journeys, period comparison, posts on older content, unknown identity, no raw identities, empty and custom range."
  );
} finally {
  await db.close();
}
