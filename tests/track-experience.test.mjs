import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import postcss from 'postcss';

const require = createRequire(import.meta.url);
const read = file => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
function compile(file, mocks = {}) {
  const exports = {};
  const code = ts.transpileModule(read(file), { compilerOptions: { module:ts.ModuleKind.CommonJS, jsx:ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(code, { exports, URL, process, window:{dispatchEvent(){}}, document:{activeElement:null}, Event, require: name => {
    if (name.endsWith('.css')) return {};
    if (name in mocks) return mocks[name];
    if (name === 'react/jsx-runtime') return require(name);
    throw new Error(`Missing mock: ${name}`);
  } });
  return exports;
}
const media = compile('lib/mediaUrls.ts');
const { inferCoverVideoUrl } = compile('lib/coverMedia.ts', { './mediaUrls':media });

test('legacy animated cover survives CDN normalization; ordinary images are never promoted to video', () => {
  const poster = 'https://res.cloudinary.com/dtgglgtfx/video/upload/so_0,f_jpg/v1781564676/ximam/cover-videos/test.jpg';
  const expected = `${media.MEDIA_BASE_URL}/cloudinary/video/ximam/cover-videos/test.mp4`;
  assert.equal(inferCoverVideoUrl(poster), expected);
  assert.equal(inferCoverVideoUrl(media.toPublicMediaUrl(poster)), expected);
  assert.equal(inferCoverVideoUrl(poster.replace('so_0,f_jpg','f_jpg,so_0')), expected);
  for (const url of [undefined, '', '/cover.jpg', 'invalid', 'https://other.test/cloudinary/video/cover-videos/test.jpg', `${media.MEDIA_BASE_URL}/covers/cover.png`, `${media.MEDIA_BASE_URL}/cloudinary/image/cover-videos/test.jpg`]) assert.equal(inferCoverVideoUrl(url), null);
});

function cover({motion=true, visible=true, enabled=true, errored=false} = {}) {
  const calls=[]; let index=0;
  const video={readyState:2, play(){calls.push('video-play');return Promise.resolve();},pause(){calls.push('video-pause');}};
  const component=compile('components/TrackCover.tsx',{
    react:{useState:initial=>[index++===2 ? errored : initial,()=>{}],useRef:()=>({current:video}),useEffect:()=>{},useCallback:fn=>fn},
    'lucide-react':{Music2:()=>null},'@/lib/mediaUrls':media,'@/lib/coverMedia':{inferCoverVideoUrl},
    '@/components/ambient/useLivingMotion':{useLivingMotion:()=>({enabled:motion})},
    '@/hooks/useCoverVisibility':{useCoverVisibility:()=>visible},
  }).default;
  return {node:component({src:'/poster.jpg',videoSrc:'/cover.mp4',autoPlayVideo:true,animationEnabled:enabled}),calls,video};
}

test('animated covers stay silent, inline, independent, and obey visibility/motion/inactive gates', async () => {
  const {node,calls,video}=cover();
  assert.equal(node.type,'video');
  assert.equal(node.props.muted,true);assert.equal(node.props.loop,true);assert.equal(node.props.playsInline,true);
  assert.equal(node.props['data-synaura-audio-policy'],'independent');
  assert.equal(node.props.autoPlay,true);assert.equal(node.props.preload,'auto');
  node.props.onCanPlay();assert.deepEqual(calls,['video-play']);assert.equal(video.muted,true);
  for(const state of [{motion:false},{visible:false},{enabled:false}]) {
    const result=cover(state);assert.equal(result.node.props.autoPlay,false);
    result.node.props.onCanPlay();result.node.props.onMouseEnter();result.node.props.onTouchStart();
    assert.deepEqual(result.calls,[],JSON.stringify(state));
    if(state.visible===false||state.enabled===false)assert.equal(result.node.props.preload,'none');
  }
  assert.equal(cover({errored:true}).node.type,'img','failed video keeps its image fallback');
});

const flatten = (node, out=[]) => { if(Array.isArray(node))node.forEach(n=>flatten(n,out));else if(node&&typeof node==='object'){out.push(node);flatten(node.props?.children,out);}return out; };
const sample={id:'song-a',title:'Un vrai morceau',artist:'Artiste',artistUsername:'artiste',artistAvatar:null,creatorId:'artist-a',audioUrl:'/song.mp3',coverUrl:'/cover.jpg',coverVideoUrl:'/cover.mp4',duration:130,genre:['Pop'],plays:2,likes:1,createdAt:'2026-09-01T10:00:00Z',isAI:false};
function trackPage({current=false,playing=false,track=sample}={}) {
  const calls=[],queries=[],surfaces=[];
  const player={ audioState:{tracks:current?[{_id:track?.id}]:[],currentTrackIndex:0,isPlaying:playing,duration:130},playTrack:async t=>calls.push(['playTrack',t]),play:()=>calls.push('play'),pause:()=>calls.push('pause'),seek:s=>calls.push(['seek',s]),getAudioElement:()=>({currentTime:17}),setShowPlayer:()=>{},setIsMinimized:()=>{} };
  const inert=()=>null;
  const mocks={
    'next/navigation':{useRouter:()=>({back:()=>calls.push('back')})},'next-auth/react':{useSession:()=>({data:null})},'@/app/providers':{useAudioPlayer:()=>player},
    'lucide-react':new Proxy({}, {get:()=>inert}), '@/components/navigation/HandoffLink':{default:'a'},
    '@/components/synaura/SynauraShell':{SynauraAppShell:'div'},'@/components/ambient/ExperienceMotionFrame':{default:'div'},
    '@/components/TrackCover':{default:'cover'},'@/components/pilot/PilotImage':{default:'img'},'@/lib/cdn':{getCdnUrl:s=>s},
    '@/components/posts/TrackPostsSection':{default:'posts'},'@/components/comments/useCommentsSurface':{useCommentsSurface:()=> (...args)=>surfaces.push(['comments',...args])},
    '@/components/comments/CommentCount':{default:inert},'@/components/actions/TrackActionButton':{default:'options'},'@/components/actions/FavoriteAction':{default:'favorite'},
    '@/components/actions/useTrackActions':{useTrackActions:()=>({open:(...args)=>surfaces.push(['action',...args]),share:(...args)=>surfaces.push(['share',...args])})},
    '@/lib/trackActions':{canPlaylistTrack:id=>!id.startsWith('ai-')},'@/components/player/Waveform':{default:'waveform'},
    '@/hooks/useTrackWaveform':{useTrackWaveform:(...args)=>{queries.push(['waveform',...args]);return {peaks:[.1,.2],loading:false,duration:130};}},
    '@/hooks/useMomentComments':{useMomentComments:id=>{queries.push(['moments',id]);return {markers:[]};}},
  };
  const node=compile('app/track/[id]/TrackPageClient.tsx',mocks).default({track});
  return {nodes:flatten(node),calls,queries,surfaces};
}

test('Track mount never starts audio; same current track resumes/pauses without replacing its queue', async () => {
  for(const state of [{},{current:true},{current:true,playing:true}]) {
    const result=trackPage(state);assert.deepEqual(result.calls,[]);
    const play=result.nodes.find(n=>n.props?.className==='track-play');await play.props.onClick();
    if(!state.current){assert.equal(result.calls[0][0],'playTrack');assert.equal(result.calls[0][1].coverVideoUrl,'/cover.mp4');}
    else assert.deepEqual(result.calls,[state.playing?'pause':'play']);
    assert.equal(result.queries[0][1],state.current?'song-a':undefined);
    assert.equal(result.queries[1][1],state.current?'song-a':undefined);
  }
});

test('Track comments/moments, playlist and share reuse controllers without mutating audio', () => {
  const result=trackPage({current:true});const trigger={id:'trigger'};
  const click=className=>result.nodes.find(n=>n.props?.className===className).props.onClick({currentTarget:trigger});
  click('track-conversation-open');click('track-moment-open');
  const waveform=result.nodes.find(n=>n.type==='waveform');waveform.props.onMarkerSeek({id:'moment-c'});
  assert.equal(result.surfaces[0][1].id,'song-a');assert.equal(result.surfaces[0][2],trigger);
  assert.equal(result.surfaces[1][3],17);assert.equal(result.surfaces[2][4],'moment-c');assert.deepEqual(result.calls,[]);
  waveform.props.onSeek(21);assert.deepEqual(result.calls,[['seek',21]]);
  result.nodes.find(n=>n.props?.['aria-label']==='Ajouter à une playlist').props.onClick({currentTarget:trigger});
  result.nodes.find(n=>n.props?.['aria-label']==='Partager ce morceau').props.onClick({currentTarget:trigger});
  assert.equal(result.surfaces[3][2],'playlist-picker');assert.equal(result.surfaces[4][0],'share');
});

test('Track AI, missing, attribution and permission branches retain the real contracts', () => {
  const ai=trackPage({current:true,track:{...sample,id:'ai-example',isAI:true}});
  assert.equal(ai.queries[0][1],undefined);
  assert.ok(!ai.nodes.some(n=>n.props?.className==='track-conversation'));
  assert.ok(!ai.nodes.some(n=>n.props?.['aria-label']==='Ajouter à une playlist'));
  const missing=trackPage({track:null});assert.deepEqual(missing.calls,[]);
  assert.ok(missing.nodes.some(n=>n.props?.href==='/discover'));
  const full=trackPage({track:{...sample,allowClips:true,canRemixAiVariation:true,musicClipsCount:3,remixAttribution:{sourceTrackId:'original',title:'Original',artist:'Auteur'},linkedChallenge:{id:'challenge',title:'Défi',status:'active'}}});
  for(const href of ['/track/original','/challenges/challenge','/live?filter=clips&sourceTrackId=song-a'])assert.ok(full.nodes.some(n=>n.props?.href===href));
  assert.equal(full.nodes.find(n=>n.type==='cover').props.trackId,'song-a');
});

test('Live binds cover metadata with an active-card gate; Track is responsive without a nested reading scroller', () => {
  const live=read('components/pilot/PilotLive.tsx'),entry=read('components/pilot/PilotLiveEntry.tsx');
  assert.match(live,/videoSrc=\{item.track.coverVideoUrl\}/);assert.match(live,/animationEnabled=\{active\}/);
  assert.match(entry,/videoSrc=\{track.coverVideoUrl\}/);
  const css=read('app/track/[id]/track-experience.css');postcss.parse(css);
  assert.match(css,/max-width:800px/);assert.match(css,/prefers-reduced-motion:reduce/);assert.match(css,/:focus-visible/);
  assert.doesNotMatch(css,/overflow-y:\s*(auto|scroll)/);
  const visibility=read('hooks/useCoverVisibility.ts');assert.match(visibility,/observer.disconnect\(\)/);
});
