import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const jsx = { createElement: (type, props, ...children) => ({type, props: props || {}, children: children.flat(Infinity)}) };
const find = (node, predicate) => !node || typeof node !== 'object' ? [] : [ ...(predicate(node) ? [node] : []), ...(node.children || []).flatMap(n => find(n, predicate)) ];
function load(path, overrides = {}) {
  const ast = ts.createSourceFile(path, read(path), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const bindings = {};
  for (const node of ast.statements.filter(ts.isImportDeclaration)) {
    if (node.importClause?.name) bindings[node.importClause.name.text] = node.importClause.name.text;
    for (const item of node.importClause?.namedBindings?.elements || []) bindings[item.name.text] = item.name.text;
  }
  const printer = ts.createPrinter();
  const source = ast.statements.filter(n => !ts.isImportDeclaration(n)).map(n => printer.printNode(ts.EmitHint.Unspecified,n,ast)).join('\n');
  const context = { ...bindings, React: jsx, exports: {}, useRef: value => ({current:value}), useEffect: () => {}, useLivingMotion: () => ({enabled:false}), ...overrides };
  runInNewContext(ts.transpileModule(source, {compilerOptions:{jsx:ts.JsxEmit.React,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText, context);
  return context.exports;
}

test('actual player render/open/menu causes no audio mutation; native seeking and transport are explicit', () => {
  const events = [];
  const state = {tracks:[{_id:'track-one',title:'One',coverUrl:'/real-cover.jpg',artist:{username:'artist'}}],currentTrackIndex:0,isPlaying:false,isLoading:false,duration:100,volume:0.5};
  const api = {audioState:state,seek:n=>events.push(['seek',n]),play:()=>events.push(['play']),pause:()=>events.push(['pause']),nextTrack:()=>events.push(['next']),previousTrack:()=>events.push(['previous'])};
  const module = load('components/player/ListeningPlayer.tsx', {useAudioPlayer:()=>api,useAudioTime:()=>({currentTime:20,duration:100})});
  let opens=0;
  const dock=module.PlayerDock({onOpen:()=>opens++,onQueue:()=>{},extraActions:'actions'});
  assert.deepEqual(events,[]);
  find(dock,n=>n.props.className==='lp-now')[0].props.onClick();
  assert.equal(opens,1); assert.deepEqual(events,[]);
  const positionNode=find(dock,n=>typeof n.type==='function' && n.type.name==='Position')[0];
  const range=find(positionNode.type(positionNode.props),n=>n.type==='input')[0];
  assert.equal(range.props.type,'range'); assert.equal(range.props.value,20);
  range.props.onChange({target:{value:'35'}});
  assert.deepEqual(events,[['seek',35]]);
  events.length=0;
  const transportNode=find(dock,n=>typeof n.type==='function' && n.type.name==='Transport')[0];
  const transport=transportNode.type({});
  find(transport,n=>n.props['aria-label']==='Reprendre la lecture')[0].props.onClick();
  assert.deepEqual(events,[['play']]);
  state.isPlaying=true; events.length=0;
  find(transportNode.type({}),n=>n.props['aria-label']==='Mettre en pause')[0].props.onClick();
  assert.deepEqual(events,[['pause']]);
  state.isLoading=true;
  assert.equal(find(transportNode.type({}),n=>n.props.className==='lp-play')[0].props.disabled,true);
  let focused=0,prevented=0;
  const menu={open:true,querySelector:()=>({focus:()=>focused++})};
  find(dock,n=>n.type==='details')[0].props.onKeyDown({key:'Escape',currentTarget:menu,preventDefault:()=>prevented++,stopPropagation:()=>{}});
  assert.equal(menu.open,false); assert.equal(focused,1); assert.equal(prevented,1);
});

test('opening/closing the actual expanded room keeps the existing queue and transport untouched', () => {
  const events=[];
  const api={audioState:{tracks:[{_id:'track-one',title:'One',artist:{}},{_id:'track-two',title:'Two'}],currentTrackIndex:0},playTrack:id=>events.push(['play',id])};
  const module=load('components/player/ListeningPlayer.tsx',{useAudioPlayer:()=>api,useTrackActions:()=>({})});
  let closes=0;
  const room=module.ListeningRoom({open:true,onClose:()=>closes++,onQueue:()=>{}});
  assert.deepEqual(events,[]);
  room.props.onClose(); assert.equal(closes,1); assert.deepEqual(events,[]);
  find(room,n=>n.props.className==='lr-next-song')[0].props.onClick();
  assert.deepEqual(events,[['play','track-two']]);
});

test('actual profile uses real cover fallback, owner-only uploads, and explicit share/play callbacks', () => {
  const module=load('components/profile/ProfileIdentity.tsx',{toPublicMediaUrl:value=>value});
  const actions=[];
  const props={profile:{username:'artist',name:'Artist',isArtist:true},own:false,followers:2,plays:5,trackCount:1,featured:{cover_url:'/real-cover.jpg'},onBack:()=>{},onShare:()=>actions.push('share'),onPlay:()=>actions.push('play'),onImage:(kind,file)=>actions.push([kind,file])};
  const visitor=module.default(props);
  assert.deepEqual(actions,[]);
  assert.equal(find(visitor,n=>n.props.className==='pr-landscape')[0].props.src,'/real-cover.jpg');
  assert.equal(find(visitor,n=>n.type==='input').length,0);
  find(visitor,n=>n.props['aria-label']==='Partager le profil')[0].props.onClick();
  find(visitor,n=>n.props.className==='pr-listen')[0].props.onClick();
  assert.deepEqual(actions,['share','play']);
  const owner=module.default({...props,own:true});
  const inputs=find(owner,n=>n.type==='input');
  assert.equal(inputs.length,2);
  const target={files:['test-image'],value:'selected'};
  inputs[1].props.onChange({target});
  assert.deepEqual(actions.at(-1),['banner','test-image']); assert.equal(target.value,'');
});

test('player and profile retain one musical authority and canonical profile cover rendering', () => {
  for (const file of ['components/player/ListeningPlayer.tsx','components/profile/ProfileIdentity.tsx']) {
    assert.doesNotMatch(read(file), /new (Audio|AudioContext)\b|<audio\b|setQueueAndPlay\(/);
  }
  const profile=read('app/profile/[username]/page.tsx');
  assert.match(profile, /src=\{track.cover_url \|\| track.coverUrl\}/);
  assert.match(read('components/pilot/PilotPlayer.tsx'), /<SynauraMiniPlayer forceVisible/);
  assert.match(read('components/FullScreenPlayer.tsx'), /summary, \[role="button"\]/);
});
