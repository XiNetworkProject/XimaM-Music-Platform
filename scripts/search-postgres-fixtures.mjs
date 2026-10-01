/**
 * Optional isolated SQL validation. No network DB connection, credentials or user data.
 * Install PGlite under ignored .tmp (NOT the application dependencies):
 * npm install --prefix .tmp/search-pg-validation --no-save --package-lock=false --ignore-scripts @electric-sql/pglite@0.5.8
 * node --experimental-strip-types scripts/search-postgres-fixtures.mjs
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { searchStatement, searchCursor, readSearchCursor } from '../lib/search/catalogue.ts';

const fixtureRequire = createRequire(new URL('../.tmp/search-pg-validation/run.cjs', import.meta.url));
const { PGlite } = fixtureRequire('@electric-sql/pglite');
const { pg_trgm } = fixtureRequire('@electric-sql/pglite/contrib/pg_trgm');
const pg = new PGlite({ extensions: { pg_trgm } });
const query = async (q, kind='tracks', limit=20, cursor=null) => {
  const statement = searchStatement(q,kind,limit,cursor);
  return (await pg.query(statement.text,statement.values)).rows;
};

try {
  await pg.exec(`
    CREATE EXTENSION pg_trgm;
    CREATE TABLE profiles(id uuid PRIMARY KEY, username text, name text, artist_name text, avatar text, bio text, is_artist boolean, total_plays integer, total_likes integer, email text);
    CREATE TABLE tracks(id text PRIMARY KEY,title text,creator_id uuid,genre text[],description text,is_public boolean,audio_url text,cover_url text,duration integer,plays integer,likes integer,created_at timestamptz);
    CREATE TABLE ai_generations(id uuid PRIMARY KEY,user_id uuid,is_public boolean,status text);
    CREATE TABLE ai_tracks(id uuid PRIMARY KEY,generation_id uuid,title text,tags text[],style text,is_public boolean,audio_url text,image_url text,duration integer,play_count integer,like_count integer,created_at timestamptz);
    CREATE TABLE playlists(id text PRIMARY KEY,name text,description text,cover_url text,creator_id uuid,is_public boolean);
    CREATE TABLE playlist_tracks(playlist_id text,track_id text);
    CREATE TABLE creator_posts(id uuid PRIMARY KEY,content text,image_url text,track_id text,creator_id uuid,is_public boolean,created_at timestamptz,likes_count integer,comments_count integer);
    CREATE TABLE music_clips(id uuid PRIMARY KEY,creator_id uuid,caption text,tags text[],poster_url text,video_url text,source_track_id text,source_track_type text,source_track_duration_seconds integer,visibility text,created_at timestamptz);
    INSERT INTO profiles VALUES('00000000-0000-4000-8000-000000000001','petit-artiste','Artiste Test',NULL,NULL,'Un profil public',true,2,1,'private-fixture@example.invalid');
    INSERT INTO tracks(id,title,creator_id,genre,is_public,audio_url,cover_url,likes,plays) VALUES
      ('exact','Échos du cœur','00000000-0000-4000-8000-000000000001',ARRAY['Jazz'],true,'fixture:audio','fixture:cover',1,1),
      ('popular','Échos du cœur — Remix','00000000-0000-4000-8000-000000000001',ARRAY['Jazz'],true,'fixture:audio',NULL,999999,999999),
      ('private','Échos du cœur secret','00000000-0000-4000-8000-000000000001',ARRAY['Jazz'],false,'fixture:audio','fixture:private-cover',0,0),
      ('blank','Échos du cœur vide','00000000-0000-4000-8000-000000000001',ARRAY['Jazz'],true,' ',NULL,0,0),
      ('fuzzy','Constellation','00000000-0000-4000-8000-000000000001',ARRAY['Ambient'],true,'fixture:audio',NULL,0,0);
    INSERT INTO ai_generations VALUES
      ('00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001',true,'completed'),
      ('00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000001',false,'completed'),
      ('00000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000001',true,'pending');
    INSERT INTO ai_tracks(id,generation_id,title,is_public,audio_url) VALUES
      ('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000002','Échos du cœur IA',true,'fixture:audio'),
      ('00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000003','Échos du cœur parent privé',true,'fixture:audio'),
      ('00000000-0000-4000-8000-000000000012','00000000-0000-4000-8000-000000000004','Échos du cœur pending',true,'fixture:audio');
    INSERT INTO playlists VALUES('public-list','Échos du cœur','Liste',NULL,'00000000-0000-4000-8000-000000000001',true),('private-list','Échos du cœur privé',NULL,NULL,'00000000-0000-4000-8000-000000000001',false);
    INSERT INTO playlist_tracks VALUES('public-list','exact'),('public-list','private'),('public-list','blank');
    INSERT INTO creator_posts(id,content,track_id,is_public) VALUES
      ('00000000-0000-4000-8000-000000000020','Échos du cœur, mon avis','private',true),
      ('00000000-0000-4000-8000-000000000021','Échos du cœur secret','exact',false);
    INSERT INTO music_clips(id,caption,video_url,source_track_id,source_track_type,visibility) VALUES
      ('00000000-0000-4000-8000-000000000030','Échos du cœur clip','fixture:video','exact','track','published'),
      ('00000000-0000-4000-8000-000000000031','Échos du cœur privé','fixture:video','private','track','published'),
      ('00000000-0000-4000-8000-000000000032','Échos du cœur draft','fixture:video','exact','track','draft'),
      ('00000000-0000-4000-8000-000000000033','Échos du cœur IA clip','fixture:video','ai-00000000-0000-4000-8000-000000000010','ai_track','published'),
      ('00000000-0000-4000-8000-000000000034','Échos du cœur IA privé','fixture:video','00000000-0000-4000-8000-000000000011','ai_track','published');
  `);

  const exact = await query('echos du coeur');
  assert.equal(exact[0].id,'exact','Exact title must outrank the highly popular remix');
  assert.equal(exact[0].score,1000);
  assert.deepEqual(new Set(exact.map(row=>row.id)),new Set(['exact','popular','ai-00000000-0000-4000-8000-000000000010']));
  assert.equal((await query('ÉCHOS DU CŒUR'))[0].id,'exact');
  assert.equal((await query('@petit-artiste')).length,4);
  assert.deepEqual((await query('Jazz')).map(row=>row.id).sort(),['exact','popular']);
  const fuzzy=await query('constelation');
  assert.equal(fuzzy[0].id,'fuzzy');assert.ok(fuzzy[0].score>0 && fuzzy[0].score<400);
  assert.equal((await query("%_'; DELETE FROM tracks;--")).length,0);

  const seen=[];let cursor=null;
  for(let n=0;n<10;n++) {
    const rows=await query('echos du coeur','tracks',1,cursor);
    if(!rows.length)break;
    seen.push(rows[0].id);
    cursor=readSearchCursor(searchCursor(rows[0],'echos du coeur','tracks'),'echos du coeur','tracks');
    if(rows.length<=1)break;
  }
  assert.deepEqual(seen,exact.map(row=>row.id));
  const profile=(await query('Artiste Test','artists'))[0].payload;
  assert.equal(profile.username,'petit-artiste');assert.ok(!('email' in profile));
  const lists=await query('echos','playlists');assert.equal(lists.length,1);assert.equal(lists[0].payload.trackCount,1);
  const posts=await query('echos','posts');assert.equal(posts.length,1);assert.equal(posts[0].payload.imageUrl,null);
  const clips=await query('echos','clips');
  assert.deepEqual(clips.map(row=>row.id).sort(),['00000000-0000-4000-8000-000000000030','00000000-0000-4000-8000-000000000033']);
  await pg.exec("UPDATE tracks SET is_public=false WHERE id='exact'");
  assert.equal((await query('echos','clips')).length,1,'Clip disappears when its source becomes private');
  assert.equal((await query('echos','playlists'))[0].payload.trackCount,0);
  console.log(JSON.stringify({result:'PASS',engine:'PGlite / PostgreSQL + pg_trgm, isolated in-memory fixtures',checks:['five SQL categories executed','accent/ligature','exact over popular','creator','genre','typo','literal injection','keyset no duplicates','private track/AI parent/draft exclusions','public playlist count','private artwork excluded','private profile fields excluded','visibility changes'],productionDatabaseTouched:false},null,2));
} finally { await pg.close(); }
