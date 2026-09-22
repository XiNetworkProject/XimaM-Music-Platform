import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import * as feed from '../lib/scrollFeed.ts';
import * as ambience from '../lib/liveAmbience.ts';

const require = createRequire(import.meta.url);
const creator = { id:'creator-a', username:'artist', name:'Artist' };
const track = { id:'track-a', title:'Shared music', cover_url:'/cover.jpg', audio_url:'/song.mp3' };
const makePost = (overrides={}) => feed.normalizeScrollPosts([{id:'post-a', type:'track_share', creator, track, ...overrides}])[0];
const flatten = (node, nodes=[]) => {
  if (Array.isArray(node)) node.forEach(child=>flatten(child,nodes));
  else if(node && typeof node==='object') { nodes.push(node); flatten(node.props?.children,nodes); }
  return nodes;
};

function render(post, {active=true, entryOpen=false}={}) {
  const calls=[];
  const inert=()=>null;
  const mocks={
    react:{ useState:value=>[value,inert] },
    'lucide-react':new Proxy({}, {get:()=>inert}),
    '@/app/providers':{useAudioPlayer:()=>({audioState:{tracks:[],currentTrackIndex:0,isPlaying:false},play:()=>calls.push('play'),pause:()=>calls.push('pause')})},
    '@/components/profile/useProfilePeek':{useProfilePeek:()=>inert},
    '@/components/comments/useCommentsSurface':{useCommentsSurface:()=> (...args)=>calls.push(['comments',...args])},
    '@/components/actions/useTrackActions':{useTrackActions:()=>({open:inert,share:()=>calls.push('track-share')})},
    '@/lib/scrollFeed':feed, '@/lib/liveAmbience':ambience,
    '@/components/TrackCover':{default:'track-cover'}, './PilotImage':{default:'pilot-image'}, './LiveArtwork':{default:'artwork'},
    './LiveSocial':{LiveFavorite:inert,LiveReactions:inert},
    './LiveAmbienceControls':{default:inert,useLiveAmbienceSettings:inert},
    './useLiveAudioPulse':{useLiveAudioPulse:inert},
    '@/components/ambient/useLivingMotion':{useLivingMotion:inert},
  };
  for(const name of ['@/components/home/SynauraScroll','@/components/FollowButton','@/components/comments/CommentCount','./PilotWaveform','./PilotLink','./PilotClipFavorite','./PilotLiveEntry','./LiveAtmosphere','./LiveSwipeLight','./LiveFilters','./LiveClipVideo']) mocks[name]={default:inert};
  // Expose the private card only in this test; production exports remain unchanged.
  const source=readFileSync(new URL('../components/pilot/PilotLive.tsx',import.meta.url),'utf8')+'\nexport { PilotItem };';
  const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
  const module={exports:{}};
  new Function('require','module','exports',output)(id=>{
    if(id.endsWith('.css')) return {};
    if(id in mocks) return mocks[id];
    if(id==='react/jsx-runtime') return require(id);
    throw new Error(`Unexpected dependency ${id}`);
  },module,module.exports);
  const model={activeIndex:active?0:1,entryOpen,sharePost:async value=>calls.push(['post-share',value]),playIndex:()=>calls.push('play-index')};
  const nodes=flatten(module.exports.PilotItem({item:{id:`post-${post.id}`,type:'post',post},index:0,model}));
  return {nodes,calls,art:nodes.find(n=>n.type==='artwork')};
}

test('shared posts render the track cover even without an audio URL; photo and text posts preserve their own visuals',()=>{
  for(const audio_url of ['/song.mp3',null]) {
    const {art,calls}=render(makePost({track:{...track,audio_url}}));
    assert.equal(flatten(art).find(n=>n.type==='track-cover').props.src,'/cover.jpg');
    assert.deepEqual(calls,[],'rendering artwork must not start audio or fetch data');
  }
  const photo=makePost({image_url:'/post.jpg'});
  const photoArt=flatten(render(photo).art);
  assert.equal(photoArt.find(n=>n.type==='pilot-image').props.src,'/post.jpg');
  assert.equal(photoArt.some(n=>n.type==='track-cover'),false);
  assert.equal(ambience.liveItemCover({type:'post',post:photo}),'/post.jpg');
  const text=makePost({type:'text',content:'Text only',track:null});
  assert.equal(flatten(render(text).art).find(n=>n.props?.className==='pilot-typographic-art').props.children,'“');
  assert.equal(ambience.liveItemCover({type:'post',post:text}),null);
});

test('post normalization retains both cover video conventions and forwards motion only to the active card',()=>{
  for(const fields of [{cover_video_url:'/cover.mp4',cover_video_poster_url:'/poster.jpg'},{coverVideoUrl:'/cover.mp4',coverVideoPosterUrl:'/poster.jpg'}]) {
    const post=makePost({track:{...track,cover_url:null,...fields}});
    assert.equal(post.track.cover_video_url,'/cover.mp4');
    assert.equal(post.track.cover_video_poster_url,'/poster.jpg');
    assert.equal(feed.trackFromScrollPost(post).coverVideoUrl,'/cover.mp4');
    assert.equal(feed.trackFromScrollPost(post).coverVideoPosterUrl,'/poster.jpg');
    assert.equal(ambience.liveItemCover({type:'post',post}),'/poster.jpg');
    for(const state of [{},{active:false},{entryOpen:true}]) {
      const cover=flatten(render(post,state).art).find(n=>n.type==='track-cover');
      assert.equal(cover.props.videoSrc,'/cover.mp4');
      assert.equal(cover.props.src,'/poster.jpg');
      assert.equal(cover.props.autoPlayVideo,!state.entryOpen && state.active!==false);
      assert.equal(cover.props.animationEnabled,cover.props.autoPlayVideo);
      assert.equal(cover.props.playOnHover,false);
    }
  }
  assert.equal(feed.trackFromScrollPost(makePost({track:{...track,audio_url:null}})),null);
  const videoOnly=makePost({track:{...track,cover_url:null,cover_video_url:'/cover.mp4'}});
  assert.equal(flatten(render(videoOnly).art).find(n=>n.type==='track-cover').props.videoSrc,'/cover.mp4');
});

test('showing track artwork keeps Comments and Share attached to the Post, not the source track',async()=>{
  const post=makePost(), {nodes,calls}=render(post), trigger={id:'trigger'};
  nodes.find(n=>n.props?.['aria-label']==='Ouvrir les commentaires').props.onClick({currentTarget:trigger});
  assert.equal(calls[0][1].type,'post');assert.equal(calls[0][1].id,post.id);assert.equal(calls[0][2],trigger);
  await nodes.find(n=>n.props?.['aria-label']==='Partager').props.onClick({currentTarget:trigger});
  assert.deepEqual(calls[1],['post-share',post]);assert.equal(calls.length,2);
});
