// Real PostgreSQL engine, ephemeral PGlite storage only. No network/credentials.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import {
  activateBooster,
  boosterHistory,
  boosterInventory,
  boosterTargets,
  claimMission,
  claimPack,
  openDaily,
  progressMissions,
} from '../lib/boosters/service.ts';
import { spinDaily } from '../lib/boosters/spin.ts';
import { CAMPAIGN_CATALOG } from '../lib/boosters/campaigns.ts';
const require = createRequire(
  new URL('../.tmp/search-pg-validation/run.cjs', import.meta.url)
);
const { PGlite } = require('@electric-sql/pglite');
const pg = new PGlite();
const owner = '00000000-0000-4000-8000-000000000001',
  other = '00000000-0000-4000-8000-000000000002';
const schema = readFileSync(
  new URL('../database/baseline/010_production_schema.sql', import.meta.url),
  'utf8'
);
let checks = 0;
const pass = (label) => {
  checks++;
  console.log(`PASS ${label}`);
};
// PGlite is single-connection; its transaction queue exercises SQL/rollback, not
// inter-process advisory-lock contention. Production uses PostgreSQL's lock.
const tx = (operation) => pg.transaction((db) => operation(db));
try {
  const tables = [
    'profiles',
    'boosters',
    'user_boosters',
    'active_track_boosts',
    'active_artist_boosts',
    'user_booster_daily',
    'user_booster_pity',
    'user_booster_pack_claims',
    'user_booster_open_history',
    'missions',
    'user_missions',
    'tracks',
    'user_daily_spin',
    'user_daily_spin_history',
    'ai_credit_balances',
    'credit_ledger',
  ];
  // profiles has an auth FK added separately in baseline; omitted in this isolated fixture.
  for (const table of tables) {
    const ddl = schema.match(
      new RegExp(`CREATE TABLE public\\.${table} \\([\\s\\S]*?\\n\\);`)
    );
    assert.ok(ddl, table);
    await pg.exec(ddl[0]);
    for (const constraint of schema.matchAll(
      new RegExp(
        `ALTER TABLE ONLY public\\.${table}\\s+ADD CONSTRAINT [^;]+(?:PRIMARY KEY|UNIQUE)[^;]+;`,
        'g'
      )
    ))
      await pg.exec(constraint[0]);
    for (const index of schema.matchAll(
      new RegExp(`CREATE UNIQUE INDEX [^;]+ON public\\.${table} [^;]+;`, 'g')
    ))
      await pg.exec(index[0]);
  }
  const creditFunction = schema.match(
    /CREATE FUNCTION public\.ai_add_credits\(p_user_id uuid, p_amount integer, p_source text[\s\S]*?\$\$;/
  )[0];
  await pg.exec(creditFunction);
  await pg.query(
    "INSERT INTO profiles(id,username,name,plan) VALUES ($1,'fixture-owner','Fixture','free'),($2,'fixture-other','Other','free')",
    [owner, other]
  );
  for (const [index, rarity] of [
    'common',
    'rare',
    'epic',
    'legendary',
  ].entries())
    await pg.query(
      "INSERT INTO boosters(key,name,type,rarity,multiplier,duration_hours) VALUES ($1,$2,'track',$3,$4,24)",
      [`track_boost_${rarity}`, rarity, rarity, index + 1]
    );
  const artist = (
    await pg.query(
      "INSERT INTO boosters(key,name,type,rarity,multiplier,duration_hours) VALUES ('artist','Artist','artist','rare',2,24) RETURNING *"
    )
  ).rows[0];
  await pg.query(
    "INSERT INTO tracks(id,title,audio_url,creator_id) VALUES ('mine','Mine','fixture:audio',$1),('other','Other','fixture:audio',$2)",
    [owner, other]
  );
  const initial = await boosterInventory(pg, owner);
  assert.equal(initial.inventory.length, 0);
  assert.equal(initial.plan, 'free');
  pass('empty inventory reads real schema without writing');
  const results = await Promise.allSettled([
    tx((db) => openDaily(db, owner, () => 0.1)),
    tx((db) => openDaily(db, owner, () => 0.1)),
  ]);
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  assert.equal(
    results.filter((r) => r.status === 'rejected')[0].reason.status,
    429
  );
  assert.equal((await boosterInventory(pg, owner)).inventory.length, 1);
  pass('queued daily opens grant once, enforce cooldown');
  const reward = results.find((r) => r.status === 'fulfilled').value.received;
  await assert.rejects(
    tx((db) => activateBooster(db, other, reward.inventory_id, 'other')),
    (error) => error.status === 404
  );
  await assert.rejects(
    tx((db) => activateBooster(db, owner, reward.inventory_id, 'other')),
    (error) => error.status === 403
  );
  await assert.rejects(
    tx((db) => activateBooster(db, owner, reward.inventory_id, 'ai-forbidden')),
    (error) => error.status === 400
  );
  assert.equal(
    (await boosterInventory(pg, owner)).inventory[0].status,
    'owned'
  );
  pass('foreign inventory, foreign track and AI target do not consume');
  await pg.query(
    "INSERT INTO tracks(id,title,audio_url,creator_id,is_public) VALUES ('private','Private','fixture:audio',$1,false),('silent','Silent','  ',$1,true)",
    [owner]
  );
  assert.deepEqual(
    (await boosterTargets(pg, owner)).tracks.map((track) => track.id),
    ['mine']
  );
  for (const id of ['private', 'silent'])
    await assert.rejects(
      tx((db) => activateBooster(db, owner, reward.inventory_id, id)),
      (error) => error.status === 400
    );
  assert.equal(
    (await boosterInventory(pg, owner)).inventory[0].status,
    'owned'
  );
  pass(
    'private and unplayable tracks cannot consume a boost and are absent from target picker'
  );
  // Inject a failure after writing active_track_boosts, at inventory consumption.
  await assert.rejects(
    tx((db) =>
      activateBooster(
        {
          query: (sql, args) => {
            if (sql.startsWith('UPDATE public.user_boosters'))
              throw new Error('injected');
            return db.query(sql, args);
          },
        },
        owner,
        reward.inventory_id,
        'mine'
      )
    ),
    /injected/
  );
  assert.equal(
    (await pg.query('SELECT * FROM active_track_boosts')).rows.length,
    0
  );
  pass('activation rolls back if consumption fails');
  await tx((db) => activateBooster(db, owner, reward.inventory_id, 'mine'));
  await assert.rejects(
    tx((db) => activateBooster(db, owner, reward.inventory_id, 'mine')),
    (error) => error.status === 409
  );
  pass('activation succeeds once and repeat is rejected');
  await assert.rejects(
    tx((db) => claimPack(db, owner, 'starter_weekly')),
    (error) => error.status === 403
  );
  await pg.query("UPDATE profiles SET plan = 'starter' WHERE id = $1", [owner]);
  const countBefore = (await boosterInventory(pg, owner)).inventory.length;
  let inserts = 0;
  await assert.rejects(
    tx((db) =>
      claimPack(
        {
          query: (sql, args) => {
            if (
              sql.startsWith('INSERT INTO public.user_boosters') &&
              ++inserts === 2
            )
              throw new Error('pack fault');
            return db.query(sql, args);
          },
        },
        owner,
        'starter_weekly',
        () => 0.5
      )
    ),
    /pack fault/
  );
  assert.equal(
    (await boosterInventory(pg, owner)).inventory.length,
    countBefore
  );
  assert.equal(
    (await pg.query('SELECT * FROM user_booster_pack_claims')).rows.length,
    0
  );
  pass('partial pack rolls back inventory, history and allowance');
  const pack = await tx((db) =>
    claimPack(db, owner, 'starter_weekly', () => 0.5)
  );
  assert.equal(pack.received.length, 3);
  assert.ok(pack.received.every((x) => x.booster.rarity !== 'common'));
  await assert.rejects(
    tx((db) => claimPack(db, owner, 'starter_weekly')),
    (error) => error.status === 429
  );
  pass('weekly pack size, rarity floor and quota');
  await pg.query("UPDATE profiles SET plan = 'pro' WHERE id = $1", [owner]);
  for (let i = 0; i < 2; i++) assert.equal((await tx(db => claimPack(db, owner, 'pro_weekly', () => .8))).received.length, 5);
  await assert.rejects(tx(db => claimPack(db, owner, 'pro_weekly')), error => error.status === 429);
  pass('Pro grants exactly two five-item packs, not a third');
  await pg.query('INSERT INTO user_booster_pity(user_id,opens_since_legendary) VALUES ($1,79)', [other]);
  const guaranteed = await tx(db => openDaily(db, other, () => .999));
  assert.equal(guaranteed.received.booster.rarity, 'legendary');
  assert.equal((await boosterInventory(pg, other)).pity.opens_since_legendary, 0);
  pass('80th no-legendary guarantee grants legendary and resets persisted pity');
  const mission = (
    await pg.query(
      "INSERT INTO missions(key,title,goal_type,threshold,reward_booster_id,cooldown_hours) VALUES ('m','Fixture mission','likes',2,$1,24) RETURNING id",
      [artist.id]
    )
  ).rows[0];
  await Promise.all([
    tx((db) => progressMissions(db, owner, { likes: 1 })),
    tx((db) => progressMissions(db, owner, { likes: 1 })),
  ]);
  assert.equal(
    (await pg.query('SELECT progress FROM user_missions')).rows[0].progress,
    2
  );
  await pg.query(
    "UPDATE user_missions SET completed_at = now() - interval '3 days'"
  );
  await tx((db) => progressMissions(db, owner, { likes: 1 }));
  assert.equal(
    (await pg.query('SELECT progress FROM user_missions')).rows[0].progress,
    2
  );
  pass('progress accumulates; earned unclaimed reward never expires');
  const claimed = await tx((db) => claimMission(db, owner, mission.id));
  await assert.rejects(
    tx((db) => claimMission(db, owner, mission.id)),
    (error) => error.status === 409
  );
  await tx((db) => progressMissions(db, owner, { likes: 1 }));
  assert.equal(
    (await pg.query('SELECT progress FROM user_missions')).rows[0].progress,
    1
  );
  pass('mission claims once and next event restarts expired claimed cycle');
  await tx((db) =>
    activateBooster(db, owner, claimed.received.inventory_id, '')
  );
  assert.equal(
    (await pg.query('SELECT * FROM active_artist_boosts')).rows.length,
    1
  );
  pass('artist booster targets owner');
  // One pack creates rows sharing a timestamp: cursor includes id to avoid gaps.
  const all = (await boosterHistory(pg, owner, { limit: 50 })).items.map(
      (x) => x.id
    ),
    paged = [];
  let cursor = null;
  do {
    const page = await boosterHistory(pg, owner, { limit: 2, cursor });
    paged.push(...page.items.map((x) => x.id));
    cursor = page.nextCursor;
  } while (cursor);
  assert.deepEqual(paged, all);
  pass('history keyset preserves every item at equal timestamps');
  const credits = await tx((db) => spinDaily(db, owner, () => 0.15));
  assert.equal(credits.rewardPayload.amount, 10);
  assert.equal(
    Number(
      (
        await pg.query(
          'SELECT balance FROM ai_credit_balances WHERE user_id=$1',
          [owner]
        )
      ).rows[0].balance
    ),
    10
  );
  await assert.rejects(
    tx((db) => spinDaily(db, owner)),
    (error) => error.status === 429
  );
  pass('spin credits use canonical ledger once');
  await assert.rejects(
    tx((db) =>
      spinDaily(
        {
          query: (sql, args) => {
            if (sql.startsWith('INSERT INTO public.user_daily_spin_history'))
              throw new Error('spin history fault');
            return db.query(sql, args);
          },
        },
        other,
        () => 0.15
      )
    ),
    /spin history fault/
  );
  assert.equal(
    (
      await pg.query('SELECT * FROM ai_credit_balances WHERE user_id=$1', [
        other,
      ])
    ).rows.length,
    0
  );
  assert.equal(
    (await pg.query('SELECT * FROM user_daily_spin WHERE user_id=$1', [other]))
      .rows.length,
    0
  );
  pass('failed spin rolls back credits, ledger and cooldown');
  const beforeMigration = await pg.query('SELECT count(*) AS n FROM user_boosters');
  await tx((db) => db.exec(readFileSync(new URL('../database/migrations/20261001120000_booster_campaign_catalog.sql', import.meta.url), 'utf8')));
  const expanded = (await boosterInventory(pg, owner)).catalog.filter((item) => item.key.startsWith('campaign_'));
  assert.equal(expanded.length, 36);
  for (const planned of CAMPAIGN_CATALOG) {
    const stored = expanded.find((item) => item.key === planned.key);
    for (const field of ['key', 'name', 'type', 'rarity', 'duration_hours']) assert.equal(stored[field], planned[field]);
    assert.equal(Number(stored.multiplier), planned.multiplier);
  }
  assert.equal((await pg.query('SELECT count(*) AS n FROM user_boosters')).rows[0].n, beforeMigration.rows[0].n);
  pass('canonical catalogue migration adds exactly 36 variants without altering owned inventory');
  const giveCampaign = async (key) => (await pg.query("INSERT INTO user_boosters(user_id,booster_id,status) SELECT $1,id,'owned' FROM boosters WHERE key=$2 RETURNING id", [owner,key])).rows[0].id;
  const creditItem = await giveCampaign('campaign_creation_epic');
  await assert.rejects(tx((db) => activateBooster(db, other, creditItem, '')), (error) => error.status === 404);
  const creditResults = await Promise.allSettled([tx((db) => activateBooster(db, owner, creditItem, '')), tx((db) => activateBooster(db, owner, creditItem, ''))]);
  assert.equal(creditResults.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(creditResults.find((result) => result.status === 'fulfilled').value.credits.amount, 24);
  assert.equal(Number((await pg.query('SELECT balance FROM ai_credit_balances WHERE user_id=$1', [owner])).rows[0].balance), 34);
  assert.equal(Number((await pg.query("SELECT count(*) AS n FROM credit_ledger WHERE user_id=$1 AND source='booster_creation'", [owner])).rows[0].n), 1);
  assert.equal((await pg.query('SELECT status FROM user_boosters WHERE id=$1', [creditItem])).rows[0].status, 'used');
  pass('creation recharge uses canonical ledger once; duplicate and foreign redemption cannot mint credits');
  const failedCredit = await giveCampaign('campaign_creation_legendary');
  await assert.rejects(tx((db) => activateBooster({ query: (sql,args) => {
    if (sql.startsWith('UPDATE public.user_boosters')) throw new Error('credit consume fault');
    return db.query(sql,args);
  } },owner,failedCredit,'')), /credit consume fault/);
  assert.equal(Number((await pg.query('SELECT balance FROM ai_credit_balances WHERE user_id=$1', [owner])).rows[0].balance), 34);
  assert.equal((await pg.query('SELECT status FROM user_boosters WHERE id=$1', [failedCredit])).rows[0].status, 'owned');
  pass('failed recharge consumption rolls back balance, ledger and inventory');
  const pulse = await giveCampaign('campaign_live_epic'), radar = await giveCampaign('campaign_radar_rare');
  await tx((db) => activateBooster(db,owner,pulse,'mine'));
  await tx((db) => activateBooster(db,owner,radar,'mine'));
  const activeFamilies = (await pg.query("SELECT b.key FROM active_track_boosts a JOIN boosters b ON b.id=a.booster_id WHERE a.track_id='mine'")).rows.map((row) => row.key);
  assert.ok(activeFamilies.includes('campaign_live_epic'));
  assert.ok(activeFamilies.includes('campaign_radar_rare'));
  assert.ok(activeFamilies.some((key) => !key.startsWith('campaign_')));
  const redundant = await giveCampaign('campaign_live_common');
  await assert.rejects(tx((db) => activateBooster(db,owner,redundant,'mine')), (error) => error.status === 409);
  assert.equal((await pg.query('SELECT status FROM user_boosters WHERE id=$1', [redundant])).rows[0].status,'owned');
  pass('different families coexist without deleting legacy boosts; weaker redundant family is not consumed');
  const revival = await giveCampaign('campaign_revival_legendary');
  await assert.rejects(tx((db) => activateBooster(db,owner,revival,'mine')), /30 jours/);
  assert.equal((await pg.query('SELECT status FROM user_boosters WHERE id=$1', [revival])).rows[0].status,'owned');
  await pg.query("INSERT INTO tracks(id,title,audio_url,creator_id,is_public,created_at) VALUES ('campaign-old','Old','fixture:audio',$1,true,now()-interval '60 days'),('campaign-release','Release','fixture:audio',$1,true,now()-interval '13 days 23 hours')", [owner]);
  await tx((db) => activateBooster(db,owner,revival,'campaign-old'));
  const release = await giveCampaign('campaign_release_legendary');
  await assert.rejects(tx((db) => activateBooster(db,owner,release,'campaign-old')), /14 jours/);
  await tx((db) => activateBooster(db,owner,release,'campaign-release'));
  const actualRelease = (await pg.query("SELECT a.expires_at,t.created_at FROM active_track_boosts a JOIN tracks t ON a.track_id=t.id WHERE t.id='campaign-release'")).rows[0];
  assert.equal(new Date(actualRelease.expires_at).getTime(), new Date(actualRelease.created_at).getTime()+14*86400000);
  pass('release and revival enforce target age before consumption; release expiry respects its actual launch window');
  const constellation = await giveCampaign('campaign_constellation_epic');
  await tx((db) => activateBooster(db,owner,constellation,''));
  assert.equal(Number((await pg.query('SELECT count(*) AS n FROM active_artist_boosts WHERE artist_id=$1',[owner])).rows[0].n),2);
  pass('constellation preserves the legacy profile boost and always targets its owner');
  const rarePool = (await pg.query("SELECT * FROM boosters WHERE rarity='rare' AND enabled=true ORDER BY key")).rows;
  const creationIndex = rarePool.findIndex((item) => item.key === 'campaign_creation_rare');
  let spinDraw = 0;
  const expandedSpin = await tx((db) => spinDaily(db,other,() => spinDraw++ === 0 ? .80 : (creationIndex+.1)/rarePool.length));
  assert.equal(expandedSpin.rewardPayload.booster.key,'campaign_creation_rare');
  assert.equal(expandedSpin.rewardPayload.booster.rarity,'rare');
  assert.equal(expandedSpin.reward.kind,'booster');
  pass('wheel preserves sector rarity but can award the expanded booster families');
  console.log(
    JSON.stringify({
      status: 'PASS',
      checks,
      engine: 'isolated PostgreSQL / PGlite',
      productionWrites: 0,
      realMultiConnectionLockContention: 'NOT TESTED',
    })
  );
} finally {
  await pg.close();
}
