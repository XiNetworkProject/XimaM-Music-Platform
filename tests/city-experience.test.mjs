import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import vm from 'node:vm';
import postcss from 'postcss';
import { cityControllerFingerprint } from './helpers/city-controller.mjs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const owner = read('components/city/SynauraCityPage.tsx');
const scene = read('components/city/CityExperience.tsx');
function runtime(states = ['events', 'open']) {
  const exports = {};
  let index = 0;
  const setters = [];
  vm.runInNewContext(ts.transpileModule(scene, {compilerOptions:{module:ts.ModuleKind.CommonJS, jsx:ts.JsxEmit.ReactJSX, target:ts.ScriptTarget.ES2022}}).outputText, {
    exports,
    require(name) {
      if (name === 'react') return {useState: initial => {const slot = index++; return [states[slot] ?? initial, value => setters.push([slot, value])];}};
      if (name === 'react/jsx-runtime') return {jsx: (type,props) => ({type,props}), jsxs:(type,props) => ({type,props})};
      if (name === 'lucide-react') return new Proxy({}, {get: (_, key) => `icon-${String(key)}`});
      if (name.endsWith('.css')) return {};
      if (['@/components/navigation/HandoffLink','@/components/TrackCover','@/components/ambient/ExperienceMotionFrame'].includes(name)) return {default:name};
      throw new Error(`Unexpected runtime dependency: ${name}`);
    },
  });
  return {exports,setters};
}
const flatten = tree => Array.isArray(tree) ? tree.flatMap(flatten) : tree && typeof tree === 'object' ? [tree, ...flatten(tree.props?.children)] : [];
const text = tree => Array.isArray(tree) ? tree.map(text).join('') : tree && typeof tree === 'object' ? text(tree.props?.children) : tree == null || typeof tree === 'boolean' ? '' : String(tree);
const track = {_id:'track-a',title:'Mon morceau', artist:{username:'alice',name:'Alice'}, audioUrl:'/a.mp3',coverUrl:'/a.jpg',genre:[],plays:7,likesCount:0,commentsCount:0,sharesCount:0,pulse:61};
const battle = {id:'battle',title:'Battle du jour',kind:'battle',isLive:true,tracks:[track],totalVotes:3};
const event = {id:'challenge',title:'Défi',kind:'challenge',isLive:true,canParticipate:true,participationCount:0};
function data(events = [battle,event]) { return {events,currentVoteSession:battle,nextVoteSession:null,cityMood:{reactionsToday:9,newDrops:0},pulse:[track],radar:[track],hallOfFame:[{id:'award',title:'Vitrine',subtitle:'Alice',track}],spotlightArtists:[{id:'alice',username:'alice',name:'Alice',trackCount:1}],listenerBadges:[{id:'badge',title:'Auditeur',description:'Écouter',unlocked:false,progress:1,target:3}],creatorCard:null}; }
function render(states, city = data()) {
  const run = runtime(states), calls = [];
  const props = {city,error:null,currentId:track._id,isPlaying:true,busy:false,onPlay:t=>calls.push(['play',t._id]),onOpen:e=>calls.push(['open',e.id]),onParticipate:e=>calls.push(['participate',e.id]),onClaim:e=>calls.push(['claim',e.id])};
  const tree = run.exports.default(props);
  return {tree,nodes:flatten(tree),calls,setters:run.setters};
}

test('City preserves the complete pre-redesign data, audio and mutation controller statements',()=>{
  assert.equal(cityControllerFingerprint(owner),read('tests/helpers/city-controller-before.sha256').trim());
  for(const binding of ['city={city}','currentId={currentId}','isPlaying={audio.audioState.isPlaying}','busy={Boolean(actingEventId)}','onPlay={play}','onOpen={setDetailEvent}','onParticipate={openParticipate}','onClaim={(event) => void claim(event)}','onVote={(trackId) => void vote(trackId)}','onPick={(trackId) => pickerEvent && void participate(pickerEvent, trackId)}']) assert.ok(owner.includes(binding),binding);
  assert.doesNotMatch(scene,/fetch\(|new Audio|<audio|useAudioPlayer|setInterval|setTimeout|localStorage/);
  assert.doesNotMatch(owner,/Rappel activé|onNotify=/);
});

test('event action respects closed states, participation permission and reward priority',()=>{
  const {cityEventAction: action} = runtime().exports;
  assert.equal(action(event),'participate');
  assert.equal(action({...event,isLive:false,status:'scheduled',canParticipate:true}),'participate');
  assert.equal(action({...event,isLive:false,status:'scheduled',canParticipate:undefined}),'open');
  assert.equal(action({...event,canParticipate:false}),'open');
  assert.equal(action(battle),'open');
  for(const status of ['ended','resolved','archived']) assert.equal(action({...event,status}),'open');
  assert.equal(action({...event,isEnded:true}),'open');
  assert.equal(action({...event,activeBoost:{multiplier:1.35}}),'open');
  assert.equal(action({...event,isEnded:true,claimStatus:'available'}),'claim');
});

test('initial scene is read-only and no event is repeated below the featured one',()=>{
  const result=render(['events','all']);
  assert.deepEqual(result.calls,[]);
  const articles=result.nodes.filter(n=>n.type==='article');
  assert.equal(articles.length,1);
  assert.ok(text(articles[0]).includes('Défi'));
  result.nodes.find(n=>n.props?.['aria-label']==='Ouvrir Battle du jour').props.onClick();
  assert.deepEqual(result.calls,[['open','battle']]);
});

test('explicit event CTA forwards the exact selected event without voting or playing',()=>{
  const result=render(['events','open']);
  result.nodes.find(n=>n.type==='button' && text(n)==='Proposer mon son').props.onClick();
  assert.deepEqual(result.calls,[['participate','challenge']]);
  const ended=render(['events','all'],data([battle,{...event,isEnded:true}]));
  assert.ok(!ended.nodes.some(n=>n.type==='button' && text(n)==='Proposer mon son'));
  ended.nodes.find(n=>n.type==='button' && text(n)==='Voir les résultats').props.onClick();
  assert.deepEqual(ended.calls,[['open','challenge']]);
});

test('filters and chapters are local state only, with explicit selected state',()=>{
  const result=render(['events','open']);
  for(const [label,slot,value] of [['Tous',1,'all'],['Les miens',1,'mine'],['Les découvertes',0,'discover'],['Mon parcours',0,'passport']]) {
    result.nodes.find(n=>n.type==='button' && text(n)===label).props.onClick();
    assert.deepEqual(result.setters.at(-1),[slot,value]);
  }
  assert.deepEqual(result.calls,[]);
  assert.equal(result.nodes.find(n=>n.type==='button' && text(n)==='À rejoindre').props['aria-pressed'],true);
});

test('discoveries preserve real artwork, creator destinations and explicit audio callbacks',()=>{
  const result=render(['discover','open']);
  const record=result.nodes.find(n=>n.props?.className==='city-record');
  assert.match(record.props['aria-label'],/^Mettre en pause Mon morceau/);
  record.props.onClick();
  assert.deepEqual(result.calls,[['play','track-a']]);
  assert.ok(result.nodes.some(n=>n.props?.href==='/profile/alice'));
  const cover=result.nodes.find(n=>typeof n.type==='function' && n.type.name==='Cover');
  const rendered=cover.type(cover.props);
  assert.equal(rendered.props.src,'/a.jpg');
  assert.equal(rendered.props.playOnHover,false);
});

test('personal chapter exposes real badges, empty state, votes, entries and available rewards',()=>{
  const empty=render(['passport','open']);
  assert.ok(text(empty.tree).includes('Aucune participation'));
  const result=render(['passport','open'],data([battle,{...event,claimStatus:'available',isEnded:true}]));
  const claim=result.nodes.find(n=>n.props?.['aria-label']==='Récupérer le gain : Défi');
  claim.props.onClick();
  assert.deepEqual(result.calls,[['claim','challenge']]);
  const progress=result.nodes.find(n=>n.type==='progress' && n.props['aria-label']==='Auditeur');
  assert.equal(progress.props.value,1);
  assert.equal(progress.props.max,3);
});

test('no-data City stays navigable without fabricated activity or missing actions',()=>{
  const city={...data([]),currentVoteSession:null,pulse:[],spotlightArtists:[],radar:[],hallOfFame:[],listenerBadges:[]};
  for(const chapter of ['events','discover','passport']) assert.doesNotThrow(()=>render([chapter,'all'],city));
  const result=render(['events','open'],city);
  assert.ok(text(result.tree).includes('Le prochain rendez-vous se prépare.'));
  assert.ok(!result.nodes.some(n=>n.props?.className==='city-marquee-action'));
});

test('City has one document scroll, native modal focus isolation and constrained motion',()=>{
  const css=postcss.parse(read('components/city/city-experience.css'));
  css.walkRules(rule=>{
    if(rule.parent.type==='atrule' && rule.parent.name==='keyframes') return;
    for(const selector of rule.selectors) assert.ok(/\.city-(experience|dialog)/.test(selector),selector);
  });
  css.walkDecls(d=>{if(d.prop==='overflow-y') assert.ok(!['auto','scroll'].includes(d.value));});
  assert.match(css.toString(),/prefers-reduced-motion: reduce/);
  assert.match(css.toString(),/data-motion="false"/);
  assert.match(css.toString(),/focus-visible/);
  const dialog=read('components/city/CityDialog.tsx');
  for(const marker of ['showModal()', 'element?.close()', 'previous.focus({ preventScroll: true })', 'onCancel=', 'aria-label={label}', "document.body.style.overflow = overflow"]) assert.ok(dialog.includes(marker),marker);
});
