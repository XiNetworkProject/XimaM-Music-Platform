import test from 'node:test';
import assert from 'node:assert/strict';
import { CAMPAIGN_CATALOG, BOOST_FAMILIES, campaignEligibility, campaignLift, campaignExpiry } from '../lib/boosters/campaigns.ts';
import { engine, signals, track, cohort, now, plain, read, compile } from './helpers/recommendation-fixtures.mjs';

const active = (family, rarity='legendary', multiplier=4) => ({ key:`campaign_${family}_${rarity}`, multiplier, expiresAt:new Date(now+86400000).toISOString() });
const context = (extra={}) => ({ now, surface:'live', createdAt:new Date(now-60*86400000).toISOString(), affinity:true, knowsArtist:false, rejected:false, ...extra });
test('36 unique boosters cover nine real effects, four tiers, preserving modest explicit creation amounts', () => {
  assert.equal(CAMPAIGN_CATALOG.length,36);
  assert.equal(new Set(CAMPAIGN_CATALOG.map((item)=>item.key)).size,36);
  assert.equal(BOOST_FAMILIES.length,9);
  for(const family of BOOST_FAMILIES) assert.equal(CAMPAIGN_CATALOG.filter((item)=>item.family===family.id).length,4);
  assert.deepEqual(CAMPAIGN_CATALOG.filter((item)=>item.type==='credits').map((item)=>item.credits),[6,12,24,48]);
});
test('Live and Radar are distinct effect surfaces, not renamed generic multipliers', () => {
  assert.ok(campaignLift(8,[active('live')],context()).lift>0);
  assert.equal(campaignLift(8,[active('live')],context({surface:'discover'})).lift,0);
  assert.ok(campaignLift(8,[active('radar')],context({surface:'discover'})).lift>0);
  assert.equal(campaignLift(8,[active('radar')],context()).lift,0);
});
test('resonance requires real affinity; horizon only prioritizes new artist discovery', () => {
  assert.equal(campaignLift(8,[active('resonance')],context({affinity:false})).lift,0);
  assert.ok(campaignLift(8,[active('resonance')],context()).lift>0);
  assert.equal(campaignLift(8,[active('horizon')],context({knowsArtist:true})).lift,0);
  assert.ok(campaignLift(8,[active('horizon')],context()).lift>0);
});
test('release and revival validate dates and never fabricate eligibility for unknown dates', () => {
  assert.equal(campaignEligibility('campaign_revival_epic',context().createdAt,now),null);
  assert.match(campaignEligibility('campaign_release_epic',context().createdAt,now),/14 jours/);
  assert.match(campaignEligibility('campaign_revival_epic',new Date(now).toISOString(),now),/30 jours/);
  assert.match(campaignEligibility('campaign_revival_epic',undefined,now),/date/);
  const created = new Date(now-13.5*86400000).toISOString();
  assert.equal(Date.parse(campaignExpiry('campaign_release_legendary',created,new Date(now+86400000).toISOString())),now+.5*86400000);
});
test('campaigns never override negative feedback or raw popularity/date sorting', () => {
  for(const extra of [{rejected:true},{strategy:'popular'},{strategy:'fresh'}]) assert.equal(campaignLift(8,[active('amplifier')],context(extra)).lift,0);
  assert.equal(campaignLift(8,[active('creation')],context()).lift,0);
});
test('expiry, unknown keys and non-finite powers cannot grant campaign lift', () => {
  for(const boost of [{...active('live'),expiresAt:new Date(now).toISOString()},{...active('live'),expiresAt:'bad'}, {...active('live'),key:'arbitrary'},active('live','legendary',Infinity),active('live','legendary',NaN)]) assert.equal(campaignLift(8,[boost],context()).lift,0);
});
test('levels produce a real stronger bonus, capped and never multiplied together', () => {
  const levels = [1.5,2,3,4].map((power)=>campaignLift(5,[active('amplifier','legendary',power)],context()).lift);
  assert.deepEqual(levels,[3.5,7,14,21]);
  assert.equal(campaignLift(100,[active('amplifier'),active('live'),active('resonance')],context()).lift,24);
  assert.equal(campaignLift(8,[active('amplifier','legendary',999)],context()).power,4);
});
test('real engine promotion has measurable score and rank impact, not a decorative card', () => {
  const s=signals(); s.signalStrength=30; s.preferredGenres.set('rap',10);
  const base=track('candidate');
  const organic=engine.scoreTrackCandidate(base,s,{now,surface:'live',debug:true});
  const promoted=engine.scoreTrackCandidate({...base,boostCampaigns:[active('amplifier')]},s,{now,surface:'live',debug:true});
  assert.equal(promoted.recommendationDebug.campaignLift,24);
  assert.ok(promoted.recommendationScore>organic.recommendationScore+23.99);
  assert.equal(promoted.recommendationReasons[0],'promotion');
  const data=cohort(90);
  const initial=engine.rerankTracks(data,s,{now,surface:'live',sessionSeed:'campaign-test'});
  const selected=initial[30];
  const boosted=engine.rerankTracks(data.map((item)=>item._id===selected._id?{...item,boostCampaigns:[active('amplifier')]}:item),s,{now,surface:'live',sessionSeed:'campaign-test'});
  const next=boosted.findIndex((item)=>item._id===selected._id);
  assert.ok(next<5, `baseline rank 31 -> ${next+1}`);
});
test('a stronger campaign cannot bypass hidden artists, source skips or repetition penalties', () => {
  const s=signals(); s.hiddenArtistIds.add('blocked');
  assert.equal(engine.rerankTracks([{...track('hidden','fresh','blocked'),boostCampaigns:[active('amplifier')]}],s,{now,surface:'live'}).length,0);
  s.currentSessionSkippedTrackIds.add('skip');
  const scored=engine.scoreTrackCandidate({...track('skip'),boostCampaigns:[active('amplifier')]},s,{now,surface:'live',debug:true});
  assert.equal(scored.recommendationDebug.campaignLift,0);
});
test('Rappel gets a real campaign opportunity even outside the normal fresh/affinity schedule', () => {
  const revived=track('forgotten'); revived.genre=['ambient'];
  for(const metric of ['qualityScore','emergingScore','freshnessScore','momentumScore']) revived.discoveryMetrics[metric]=0;
  revived.rankingScore=1;
  const source=[...cohort(90),{...revived,boostCampaigns:[active('revival')]}];
  const ranked=engine.rerankTracks(source,signals(),{now,surface:'live'});
  assert.ok(ranked.findIndex((item)=>item._id==='forgotten')<20);
});
test('campaign feed budget stays one in five while organic alternatives exist, including fallback buckets', () => {
  const data=cohort(180).map((item,i)=>i<90?{...item,boostCampaigns:[active('amplifier')]}:item);
  const ranked=engine.rerankTracks(data,signals(),{now,surface:'live'});
  for(let index=0;index<80;index++) assert.ok(ranked.slice(index,index+5).filter((item)=>item.campaignPromoted).length<=1);
  assert.equal(ranked.length,180);
  assert.equal(new Set(ranked.map((item)=>item._id)).size,180);
});
test('new campaigns keep acquisition and mutation ownership server-side', () => {
  const source=read('components/boosters/BoosterCatalog.tsx');
  assert.doesNotMatch(source,/fetch\(|useBoosters\(|ai_add_credits/);
  assert.match(source,/non déployées/);
  assert.match(read('lib/recommendation/candidates.ts'),/campaignTracks, \.\.\.campaignArtistTracks/);
  assert.match(read('lib/boosters/service.ts'),/activationFamily\(row.booster_key\) === activationFamily\(booster.key\)/);
});

test('Live ranking and web/native discovery explicitly pass the campaign surface', () => {
  for (const path of ['app/api/ranking/feed/route.ts', 'app/api/recommendations/feed/route.ts', 'lib/recommendation/serverFeed.ts']) {
    assert.match(read(path), /rerankTracks\([\s\S]*?surface: 'live'/, path);
  }
  for (const path of ['app/api/discover/route.ts', 'app/api/discover/moods/route.ts', 'app/api/mobile/discover/route.ts']) {
    assert.match(read(path), /rerankTracks\([\s\S]*?surface: 'discover'/, path);
  }
  assert.equal((read('app/api/mobile/discover/route.ts').match(/surface: 'discover'/g) || []).length, 2);
});

function activeRoute({authenticated=true, failure=null, empty=false}={}) {
  const queries=[];
  const db={from(table){
    const calls=[]; queries.push({table,calls});
    const result={data:empty?[]:table==='active_track_boosts'?[{id:'active',track_id:'track',booster_id:'catalog',multiplier:3,expires_at:'2030-01-01'}]:table==='boosters'?[{id:'catalog',key:'campaign_live_epic'}]:[],error:failure===table?{message:'unavailable'}:null};
    const chain={};
    for(const method of ['select','eq','gt','order','in']) chain[method]=(...args)=>{calls.push([method,...args]);return chain;};
    chain.then=(resolve,reject)=>Promise.resolve(result).then(resolve,reject);
    return chain;
  }};
  const route=compile(read('app/api/boosters/my-active/route.ts'),{'next/server':{NextResponse:{json:(body,options)=>({body,status:options?.status||200})}},'next-auth':{getServerSession:async()=>authenticated?{user:{id:'owner'}}:null},'@/lib/authOptions':{authOptions:{}},'@/lib/database':{dbAdmin:db}});
  return {queries, get:()=>route.GET({})};
}
test('active family endpoint remains authenticated, owner-scoped and read-only',async()=>{
  const guest=activeRoute({authenticated:false}); assert.equal((await guest.get()).status,401);assert.equal(guest.queries.length,0);
  const h=activeRoute(); const response=await h.get();assert.equal(response.status,200);
  assert.equal(response.body.boosts[0].booster_key,'campaign_live_epic');
  assert.ok(h.queries[0].calls.some(([method,column,id])=>method==='eq'&&column==='user_id'&&id==='owner'));
  assert.ok(h.queries[1].calls.some(([method,column,id])=>method==='eq'&&column==='artist_id'&&id==='owner'));
  assert.deepEqual(plain(h.queries[2].calls.find(([method])=>method==='in')),['in','id',['catalog']]);
  assert.ok(h.queries.slice(0,2).every((query)=>query.calls.some(([method,column])=>method==='gt'&&column==='expires_at')));
});
test('active family lookup errors fail explicitly; an empty account does not scan the catalogue',async()=>{
  assert.equal((await activeRoute({failure:'boosters'}).get()).status,500);
  const h=activeRoute({empty:true}); assert.equal((await h.get()).status,200);assert.equal(h.queries.length,2);
});
