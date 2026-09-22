import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import postcss from 'postcss';

const require = createRequire(import.meta.url);
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const track = { _id:'real-track', title:'Real sound', artist:{ _id:'creator',name:'Artist',username:'artist' },likes:12,comments:4,duration:123,audioUrl:'/real.mp3',coverUrl:'/real.jpg' };
function setup({ liked=false, pending=false, motion=true } = {}) {
  const calls = [], reads = [], notifications = [];
  const icons = Object.fromEntries(['ArrowUpRight','Heart','MessageCircle','Share2'].map(name=>[name,()=>null]));
  const mocks = {
    react:{ useRef:value=>({current:value}),useState:value=>[value,()=>{}] },
    'lucide-react':icons,
    '@/contexts/LikeContext':{ useTrackLike:()=>({ isLiked:liked,likesCount:12 }) },
    '@/lib/organizationClient':{ useActionFavoriteStatus:(...args)=>reads.push(args),useFavoriteActions:()=>({pending,toggle:async id=>calls.push(['like',id])}) },
    '@/components/NotificationCenter':{ notify:{error:(...args)=>notifications.push(args)} },
    '@/components/comments/useCommentsSurface':{useCommentsSurface:()=> (...args)=>calls.push(['comments',...args])},
    '@/components/actions/useTrackActions':{useTrackActions:()=>({share:async (...args)=>calls.push(['share',...args])})},
    '@/components/comments/CommentCount':{default:()=>null},
    '@/components/player/LiveReactionBurst':{useLiveReactionBurst:()=>({layer:null,emit:type=>calls.push(['burst',type])})},
    '@/components/ambient/useLivingMotion':{useLivingMotion:()=>({enabled:motion})},
    '@/lib/momentReactions':{MOMENT_REACTION_TYPES:['drop','emotional','mindblown','favorite','vocals','production'],MOMENT_REACTION_META:Object.fromEntries(['drop','emotional','mindblown','favorite','vocals','production'].map(type=>[type,{emoji:type,label:type}]))},
  };
  const module = {exports:{}};
  const output = ts.transpileModule(read('components/pilot/LiveSocial.tsx'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
  new Function('require','module','exports',output)(id=>id in mocks ? mocks[id] : require(id),module,module.exports);
  return {...module.exports,calls,reads,notifications};
}
function flatten(root) { const nodes=[]; const visit=node=>{if(!node||typeof node!=='object')return;if(Array.isArray(node))return node.forEach(visit);nodes.push(node);visit(node.props?.children);};visit(root);return nodes; }

test('Live favorites use the shared mutation only on click and gate inactive status reads', async () => {
  const s=setup();
  const inactive=s.LiveFavorite({track,active:false});
  assert.equal(inactive.props.disabled,true); assert.deepEqual(s.reads,[['real-track',false]]); assert.deepEqual(s.calls,[]);
  const active=s.LiveFavorite({track,active:true});
  assert.equal(active.props['aria-pressed'],false); assert.match(active.props['aria-label'],/Aimer Real sound/);
  active.props.onClick({preventDefault(){},stopPropagation(){}});
  await Promise.resolve(); assert.deepEqual(s.calls,[['like','real-track']]);
  assert.equal(setup({liked:true}).LiveFavorite({track,active:true}).props['aria-pressed'],true);
  assert.equal(setup({pending:true}).LiveFavorite({track,active:true}).props.disabled,true);
});

test('entry comments and share operate in place with the exact real entity, not a track redirect', async () => {
  const s=setup();let routes=0;
  const tree=s.LiveEntrySocial({track,openTrack:()=>routes++});
  assert.deepEqual(s.calls,[]);
  const nodes=flatten(tree), trigger={id:'trigger'};
  nodes.find(n=>n.props?.className==='live-comment-action').props.onClick({currentTarget:trigger});
  assert.equal(s.calls[0][0],'comments'); assert.equal(s.calls[0][1].id,track._id);
  assert.equal(s.calls[0][1].type,'track'); assert.equal(s.calls[0][1].count,4); assert.equal(s.calls[0][2],trigger);
  assert.equal(routes,0);
  nodes.find(n=>n.props?.['aria-label']==='Partager ce morceau').props.onClick({currentTarget:trigger});
  await Promise.resolve(); assert.equal(s.calls[1][0],'share'); assert.equal(s.calls[1][1],track); assert.equal(routes,0);
  nodes.find(n=>n.props?.['aria-label']==='Voir le morceau').props.onClick();assert.equal(routes,1);
});

test('reactions are explicit, bounded while pending, and do not animate when motion is off', async () => {
  const s=setup();let release;const sent=[];
  const tree=s.LiveReactions({active:true,onReact:type=>{sent.push(type);return new Promise(resolve=>{release=resolve;});}});
  const buttons=flatten(tree).filter(n=>n.type==='button');assert.equal(buttons.length,6);assert.deepEqual(sent,[]);
  const first=buttons[0].props.onClick(); await buttons[1].props.onClick();assert.deepEqual(sent,['drop']);assert.deepEqual(s.calls,[['burst','drop']]);
  release();await first;
  const paused=setup({motion:false});const stopped=paused.LiveReactions({active:true,onReact:async()=>{}});
  await flatten(stopped).find(n=>n.type==='button').props.onClick();assert.deepEqual(paused.calls,[]);
  let attempts=0;const off=s.LiveReactions({active:false,onReact:async()=>{attempts++;}});
  const disabled=flatten(off).find(n=>n.type==='button');assert.equal(disabled.props.disabled,true);await disabled.props.onClick();assert.equal(attempts,0);
});

test('new visuals stay in Live and honor motion, viewport bounds and existing scroll ownership', () => {
  const css=read('components/pilot/live-experience.css');
  postcss.parse(css).walkRules(rule=>{if(rule.parent.type==='atrule'&&rule.parent.name==='keyframes')return;for(const selector of rule.selectors)assert.ok(selector.includes('.live-experience'),selector);});
  assert.match(css,/prefers-reduced-motion:reduce/);assert.match(css,/data-motion="true"/);
  postcss.parse(css).walkDecls('overflow-y',decl=>{if(/auto|scroll/.test(decl.value))assert.ok(decl.parent.selector.includes('[data-live-comments]'),'only the modal can scroll, not an inner feed card');});
  const scene=read('components/pilot/PilotLive.tsx');
  assert.match(scene,/index === model.activeIndex && !model.entryOpen/);
  assert.match(scene,/<SynauraScroll renderPilot=/);assert.match(scene,/onTouchStart=\{scrollSnap.onTouchStart\}/);
  assert.match(scene,/useLivingMotion\(\)/);
  assert.match(scene,/type: 'clip', id: item.clip.id/);assert.match(scene,/type: 'post', id: item.post.id/);
  const atmosphere=read('components/pilot/LiveAtmosphere.tsx');
  assert.match(atmosphere,/aria-hidden="true"/);assert.match(atmosphere,/src=\{cover\}/);
  assert.doesNotMatch(atmosphere,/useEffect|Math.random|requestAnimationFrame|<audio|<canvas|new Audio/);
});

test('Live conversation reserves its space for messages and leaves other origins unchanged', () => {
  const source=read('components/comments/CommentsSurface.tsx');
  assert.match(source,/const live = entry.origin === 'live'/);
  assert.match(source,/data-live-comments=\{live \|\| undefined\}/);
  assert.match(source,/musical && \(!live \|\| draft.mode === 'moments'\) && <MusicalWaveform/);
  for (const contract of ['draftKey','viewport?.removeEventListener','closeSurface()','onSeek={explicitSeek}','comments.mutate']) assert.ok(source.includes(contract),contract);
  const css=read('components/pilot/live-experience.css');
  assert.match(css,/width:min\(52vw,760px\)/);
  assert.match(css,/height:min\(96dvh,calc\(100dvh - var\(--comments-keyboard,0px\)\)\)/);
  assert.match(css,/safe-area-inset-bottom/);
  assert.match(css,/#comments-panel \{ min-height:0; flex:1;/);
});
