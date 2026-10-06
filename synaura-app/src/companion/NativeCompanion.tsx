import React, {useCallback,useEffect,useRef,useState} from 'react';
import {AccessibilityInfo,AppState,DeviceEventEmitter,Keyboard,KeyboardAvoidingView,Modal,PanResponder,Platform,Pressable,ScrollView,StyleSheet,Switch,Text,TextInput,View,useWindowDimensions} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Ionicons} from '@expo/vector-icons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useQueryClient} from '@tanstack/react-query';
import {useAuth} from '@/auth/AuthProvider';
import {usePlayer} from '@/player/PlayerProvider';
import {useNativeCalls} from '@/calls/NativeCallProvider';
import {useNativeNotifications} from '@/notifications/NativeNotificationsProvider';
import {useMobileSettings} from '@/settings/MobileSettingsProvider';
import {navigationRef} from '@/navigation/navigationRef';
import {navigatePrimaryTab} from '@/navigation/navigatePrimaryTab';
import {openInternalLink} from '@/navigation/internalLinks';
import {API_BASE_URL} from '@/api/client';
import {FennecSprite,type PetState} from './FennecSprite';
import {DEFAULT_COMPANION,companionPreferences,pageGuide,answerCompanion,companionSearchHits,allowHint,type CompanionPreferences,type CompanionAnswer,type CompanionAction,type SearchHit} from './core';

class CompanionBoundary extends React.Component<{children:React.ReactNode},{failed:boolean}>{
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  componentDidCatch(){console.warn('[companion] Presence unavailable; application unaffected.');}
  render(){return this.state.failed?null:this.props.children;}
}
export function NativeCompanion(props:{activeRoute:string;blocked:boolean}) {
  const auth=useAuth();
  if(auth.loading||auth.biometricLocked||auth.mfaRequired)return null;
  return <CompanionBoundary key={auth.user?.id||'guest'}><Companion {...props} owner={auth.user?.id||'guest'}/></CompanionBoundary>;
}

function Companion({activeRoute,blocked,owner}:{activeRoute:string;blocked:boolean;owner:string}) {
  const player=usePlayer(),calls=useNativeCalls(),notifications=useNativeNotifications();
  const queryClient=useQueryClient(),lastReaction=useRef(0);
  const {settings:mobileSettings}=useMobileSettings(),insets=useSafeAreaInsets(),screen=useWindowDimensions();
  const [prefs,setPrefs]=useState(DEFAULT_COMPANION),[loaded,setLoaded]=useState(false);
  const [open,setOpen]=useState(false),[settingsOpen,setSettingsOpen]=useState(false),[keyboard,setKeyboard]=useState(false),[foreground,setForeground]=useState(AppState.currentState==='active');
  const [state,setState]=useState<PetState>('appear'),[hint,setHint]=useState('');
  const [systemReduced,setSystemReduced]=useState(false);
  const [question,setQuestion]=useState(''),[answer,setAnswer]=useState<CompanionAnswer|null>(null),[hits,setHits]=useState<SearchHit[]>([]),[searching,setSearching]=useState(false);
  const [confirmation,setConfirmation]=useState<{action:CompanionAction;trackId?:string}|null>(null);
  const abort=useRef<AbortController|null>(null),generation=useRef(0),hintGate=useRef({lastAt:Date.now()-180000,seen:new Set<string>()});
  const lastTouch=useRef(Date.now()),lastUnread=useRef<number|undefined>(undefined),saveTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
  const size=prefs.size==='small'?108:144,reduced=mobileSettings.reducedMotion||prefs.reduced||systemReduced;
  const margin=size<140?24:8;
  const left=insets.left+margin,right=Math.max(left,screen.width-insets.right-size-margin),top=insets.top+48,bottom=Math.max(top,screen.height-insets.bottom-size-(player.current?210:150));
  // Live has a right-hand action rail; prefer the opposite side until moved explicitly.
  const x=left+(right-left)*(!prefs.positioned&&activeRoute==='Swipe'?0:prefs.x),y=top+(bottom-top)*prefs.y;
  const quiet=blocked||keyboard||calls.engaged||!foreground;
  const current=useRef({prefs,quiet,open,player,activeRoute,x,y,left,right,top,bottom});
  current.current={prefs,quiet,open,player,activeRoute,x,y,left,right,top,bottom};
  const storageKey=`synaura.companion.v1.${owner}`;
  const patch=(value:Partial<CompanionPreferences>)=>setPrefs(p=>companionPreferences({...p,...value}));
  const rest=useCallback(()=>setState(current.current.player.isPlaying?'music':'idle'),[]);
  const play=(value:PetState)=>{lastTouch.current=Date.now();setState(value);};
  function whisper(text:string,key:string){const s=current.current;if(allowHint(hintGate.current,key,Date.now(),s.prefs.hints,s.quiet||s.open||s.prefs.hidden))setHint(text);}
  function close(){setOpen(false);setConfirmation(null);abort.current?.abort();generation.current++;setSearching(false);}
  useEffect(()=>{let live=true;void AsyncStorage.getItem(storageKey).then(raw=>{if(live)setPrefs(companionPreferences(raw?JSON.parse(raw):null));}).catch(()=>{}).finally(()=>{if(live)setLoaded(true);});return()=>{live=false;abort.current?.abort();generation.current++;};},[storageKey]);
  useEffect(()=>{if(!loaded)return;clearTimeout(saveTimer.current);saveTimer.current=setTimeout(()=>{void AsyncStorage.setItem(storageKey,JSON.stringify(prefs)).catch(()=>{});},200);return()=>clearTimeout(saveTimer.current);},[prefs,loaded,storageKey]);
  useEffect(()=>{
    let live=true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value=>{if(live)setSystemReduced(value);}).catch(()=>{});
    const motion=AccessibilityInfo.addEventListener('reduceMotionChanged',setSystemReduced);
    const shown=Keyboard.addListener('keyboardDidShow',()=>setKeyboard(true)),hidden=Keyboard.addListener('keyboardDidHide',()=>setKeyboard(false));
    const app=AppState.addEventListener('change',s=>setForeground(s==='active'));
    return()=>{live=false;motion.remove();shown.remove();hidden.remove();app.remove();};
  },[]);
  useEffect(()=>{if(calls.engaged){close();setHint('');setState('sit');}},[calls.engaged]);
  useEffect(()=>{if(blocked||!foreground)close();},[blocked,foreground]);
  useEffect(()=>{setConfirmation(null);setState(player.isPlaying?'music':'idle');},[player.isPlaying,player.current?._id]);
  useEffect(()=>{
    setConfirmation(null);
    const timer=setTimeout(()=>{if(!current.current.quiet){play('curious');whisper(`Tu explores ${pageGuide(activeRoute).title} ? Je peux te guider.`,`page:${pageGuide(activeRoute).title}`);}},8000);
    return()=>clearTimeout(timer);
  },[activeRoute]);
  useEffect(()=>{const n=notifications.unreadCount;if(lastUnread.current!==undefined&&n>lastUnread.current){if(!current.current.quiet)setState('look');whisper('Du nouveau dans tes notifications.','notifications');}lastUnread.current=n;},[notifications.unreadCount]);
  useEffect(()=>{if(notifications.error)whisper('Les notifications signalent un problème. Je peux te guider.','notification-error');},[notifications.error]);
  useEffect(()=>{
    // Observe statuses only: no query payload, private conversation or error details.
    const react=()=>{if(current.current.quiet||Date.now()-lastReaction.current<12000)return;lastReaction.current=Date.now();lastTouch.current=Date.now();setState('happy');};
    const activity=DeviceEventEmitter.addListener('synaura:recommendation-signal',react);
    const queries=queryClient.getQueryCache().subscribe(event=>{if(event.type==='updated'&&event.query.state.status==='error')whisper('Un chargement a rencontré un problème. Besoin d’aide ?','load-error');});
    const mutations=queryClient.getMutationCache().subscribe(event=>{if(event.type!=='updated')return;if(event.mutation.state.status==='success')react();else if(event.mutation.state.status==='error')whisper('Une action a rencontré un problème. Besoin d’aide ?','action-error');});
    return()=>{activity.remove();queries();mutations();};
  },[queryClient]);
  useEffect(()=>{if(!hint)return;const timer=setTimeout(()=>setHint(''),6500);return()=>clearTimeout(timer);},[hint]);
  useEffect(()=>{
    if(!loaded||quiet||open||prefs.hidden||reduced||!prefs.autonomous||player.isPlaying)return;
    const timer=setInterval(()=>{if(Date.now()-lastTouch.current>60000){setState('sleep');return;}const choices:PetState[]=['blink','tail','curious','look','walk','play'];setState(choices[Math.floor(Math.random()*choices.length)]);},6500);
    return()=>clearInterval(timer);
  },[loaded,quiet,open,prefs.hidden,prefs.autonomous,reduced,player.isPlaying]);
  const start=useRef({x:0,y:0});
  const pan=useRef(PanResponder.create({
    onStartShouldSetPanResponder:()=>true,
    onPanResponderGrant:()=>{start.current={x:current.current.x,y:current.current.y};lastTouch.current=Date.now();setState('stand');},
    onPanResponderMove:(_,g)=>{const b=current.current;setPrefs(p=>companionPreferences({...p,positioned:true,x:(start.current.x+g.dx-b.left)/Math.max(1,b.right-b.left),y:(start.current.y+g.dy-b.top)/Math.max(1,b.bottom-b.top)}));},
    onPanResponderRelease:()=>play('happy'),onPanResponderTerminate:rest,
  })).current;
  async function ask(text=question){
    abort.current?.abort();const id=++generation.current;setHits([]);setSearching(false);setConfirmation(null);
    const s=current.current,response=answerCompanion(text,{path:s.activeRoute,playing:s.player.isPlaying,trackTitle:s.player.current?.title,trackId:s.player.current?._id,unread:notifications.lastSyncedAt?notifications.unreadCount:undefined,calling:calls.engaged,online:true});
    setAnswer(response);play('curious');if(!response.search)return;
    const controller=new AbortController();abort.current=controller;setSearching(true);
    const timeout=setTimeout(()=>controller.abort(),12000);
    try{const result=await fetch(`${API_BASE_URL}/api/search?q=${encodeURIComponent(response.search)}&limit=3`,{signal:controller.signal});if(!result.ok)throw Error();const data=await result.json();if(generation.current!==id)return;const found=companionSearchHits(data);setHits(found);setAnswer({...response,text:found.length?'Voici ce que le catalogue renvoie.':'Aucun résultat confirmé pour cette recherche.',search:undefined,actions:[{label:'Tous les résultats',href:`/search?q=${encodeURIComponent(response.search)}`}]});}
    catch{if(generation.current===id)setAnswer({text:'La recherche ne répond pas. Je n’ai aucun résultat confirmé.',source:'Recherche Synaura',actions:[]});}
    finally{clearTimeout(timeout);if(generation.current===id)setSearching(false);}
  }
  async function execute(action:CompanionAction,confirmed=false){
    if(action.confirm&&!confirmed){setConfirmation({action,trackId:player.current?._id});return;}
    if(action.audio){
      if(calls.engaged||!confirmed||confirmation?.trackId!==player.current?._id){setConfirmation(null);return;}
      setConfirmation(null);try{await player[action.audio]();}catch{setAnswer({text:'Le lecteur n’a pas pu effectuer cette action.',source:'Lecteur Synaura',actions:[]});}return;
    }
    if(!action.href?.startsWith('/')||action.href.startsWith('//')||!navigationRef.isReady())return;
    const url=action.href;
    try{
      if(url==='/live')navigatePrimaryTab(navigationRef,'Swipe');
      else if(url==='/')navigationRef.navigate('Home');
      else if(url==='/discover')navigatePrimaryTab(navigationRef,'Discover');
      else if(url==='/library')navigatePrimaryTab(navigationRef,'Library');
      else if(url==='/create')navigationRef.navigate('CreateHub');
      else if(url.startsWith('/search?'))navigationRef.navigate('Search',{query:new URLSearchParams(url.split('?')[1]).get('q')||''});
      else if(url.startsWith('/track/'))navigationRef.navigate('TrackDetail',{trackId:decodeURIComponent(url.slice(7))});
      else if(!(await openInternalLink(navigationRef,url)))throw Error();
      close();
    }catch{setAnswer({text:'Je n’ai pas pu ouvrir cet espace. Réessaie depuis la navigation.',source:'Navigation Synaura',actions:[]});}
  }
  function show(){lastTouch.current=Date.now();setHint('');setSettingsOpen(false);setAnswer(null);setQuestion('');setHits([]);setOpen(true);}
  if(!loaded)return null;
  const button=(label:string,onPress:()=>void)=> <Pressable accessibilityRole="button" onPress={onPress} style={s.button}><Text style={s.buttonText}>{label}</Text></Pressable>;
  return <>
    {!quiet&&!open&&<View pointerEvents="box-none" style={[s.presence,{left:x,top:y,width:size,height:size+38}]}>
      {prefs.hidden?<Pressable accessibilityRole="button" accessibilityLabel="Faire revenir le compagnon" onPress={()=>patch({hidden:false})} style={s.restore}><Ionicons name="paw-outline" size={21} color="#DEE9FC"/></Pressable>:<>
        {!!hint&&<Pressable accessibilityRole="button" accessibilityLabel={hint} onPress={show} style={[s.hint,x<screen.width/2?{left:0}:{right:0}]}><Text style={s.hintText}>{hint}</Text></Pressable>}
        <Pressable onPress={()=>play('pet')} onLongPress={show} accessibilityRole="button" accessibilityLabel={`${prefs.name}. Toucher pour caresser, maintenir pour ouvrir son aide.`}><FennecSprite state={state} size={size} reduced={reduced} paused={quiet} onComplete={rest}/></Pressable>
        <View style={s.tools}>
          <Pressable accessibilityRole="button" accessibilityLabel={`Parler à ${prefs.name}`} onPress={show} style={s.tool}><Ionicons name="chatbubble-outline" size={18} color="#DEE9FC"/></Pressable>
          <View {...pan.panHandlers} accessible accessibilityRole="adjustable" accessibilityLabel="Position du compagnon" accessibilityHint="Glisser pour déplacer. Augmenter ou diminuer pour changer de côté." accessibilityActions={[{name:'increment',label:'Placer à droite'},{name:'decrement',label:'Placer à gauche'}]} onAccessibilityAction={e=>patch({x:e.nativeEvent.actionName==='increment'?1:0})} style={s.tool}><Ionicons name="move-outline" size={18} color="#DEE9FC"/></View>
          <Pressable accessibilityRole="button" accessibilityLabel="Masquer le compagnon" onPress={()=>patch({hidden:true})} style={s.tool}><Ionicons name="eye-off-outline" size={18} color="#DEE9FC"/></Pressable>
        </View>
      </>}
    </View>}
    <Modal visible={open&&!calls.engaged&&!blocked} transparent animationType={reduced?'none':'fade'} onRequestClose={close}>
      <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} style={s.modal}>
        <Pressable accessibilityLabel="Fermer l’aide du compagnon" style={StyleSheet.absoluteFill} onPress={close}/>
        <View accessibilityViewIsModal style={[s.panel,{maxHeight:screen.height-insets.top-40,paddingBottom:Math.max(20,insets.bottom)}]}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{padding:20,gap:16}}>
            <View style={s.heading}><FennecSprite state="idle" size={64} reduced paused onComplete={rest}/><View style={{flex:1}}><Text accessibilityRole="header" style={s.title}>{prefs.name}</Text><Text style={s.secondary}>{player.isPlaying?'On écoute ensemble.':`À tes côtés dans ${pageGuide(activeRoute).title}.`}</Text></View><Pressable accessibilityLabel="Fermer" accessibilityRole="button" style={s.tool} onPress={close}><Ionicons name="close" size={24} color="#DEE9FC"/></Pressable></View>
            <View style={s.row}>{button('Caresser',()=>{play('pet');close();})}{button('Jouer',()=>{play('play');close();})}{button('Repos',()=>{play('sleep');close();})}{button('Réglages',()=>setSettingsOpen(!settingsOpen))}</View>
            {settingsOpen?<>
              <Text style={s.secondary}>Son petit nom</Text><TextInput accessibilityLabel="Nom du compagnon" style={s.input} value={prefs.name} maxLength={24} onChangeText={name=>patch({name})}/>
              <View style={s.row}>{button(prefs.size==='small'?'✓ Discret':'Discret',()=>patch({size:'small'}))}{button(prefs.size==='normal'?'✓ Normal':'Normal',()=>patch({size:'normal'}))}</View>
              {([['autonomous','Se promener et jouer'],['hints','Petits conseils spontanés'],['reduced','Moins de mouvements']] as const).map(([key,label])=><View key={key} style={s.toggle}><Text style={s.body}>{label}</Text><Switch accessibilityLabel={label} value={prefs[key]} onValueChange={value=>patch({[key]:value})}/></View>)}
              {button('Replacer dans le coin',()=>patch({x:1,y:1}))}{button('Masquer — une patte permet de le rappeler',()=>{patch({hidden:true});close();})}
              <Text style={s.secondary}>Réglages sur cet appareil. Aucun micro, message privé ou historique de questions enregistré.</Text>
            </>:<>
              <View style={s.row}>{button('M’aider ici',()=>void ask('aide'))}{button('Pas à pas',()=>void ask('guide moi'))}{button('Ce qu’on écoute',()=>void ask('Qu’est-ce qui joue ?'))}</View>
              <TextInput accessibilityLabel="Ta question au compagnon" style={s.input} placeholder="Une question, un son à retrouver…" placeholderTextColor="#9DAAC2" value={question} onChangeText={setQuestion} maxLength={400} returnKeyType="search" onSubmitEditing={()=>{Keyboard.dismiss();void ask();}}/>
              <Pressable accessibilityRole="button" disabled={!question.trim()||searching} onPress={()=>{Keyboard.dismiss();void ask();}} style={[s.button,{opacity:!question.trim()||searching?.5:1}]}><Text style={s.buttonText}>Demander</Text></Pressable>
              <Text accessibilityLiveRegion="polite" style={s.body}>{searching?'Je cherche dans Synaura…':answer?.text||pageGuide(activeRoute).text}</Text>
              {answer&&<Text style={s.secondary}>{answer.source}</Text>}
              {hits.map(hit=><React.Fragment key={hit.href}>{button(`${hit.detail} · ${hit.label}`,()=>void execute({label:hit.label,href:hit.href}))}</React.Fragment>)}
              {answer?.actions.map(action=><React.Fragment key={action.label}>{button(action.label,()=>void execute(action))}</React.Fragment>)}
              {confirmation&&<View style={s.confirm}><Text style={s.body}>{confirmation.action.confirm}</Text>{button(`Confirmer : ${confirmation.action.label}`,()=>void execute(confirmation.action,true))}{button('Annuler',()=>setConfirmation(null))}</View>}
              <Text style={s.secondary}>Une aide Synaura, pas une réponse inventée. Aucune publication, dépense ou modification de compte automatique.</Text>
            </>}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  </>;
}
const s=StyleSheet.create({
  presence:{position:'absolute',zIndex:90},restore:{position:'absolute',right:0,bottom:0,width:44,height:44,borderRadius:22,alignItems:'center',justifyContent:'center',backgroundColor:'#172033'},
  tools:{position:'absolute',bottom:0,alignSelf:'center',flexDirection:'row',borderRadius:24,backgroundColor:'#172033EE'},tool:{width:44,height:44,alignItems:'center',justifyContent:'center'},
  hint:{position:'absolute',bottom:'100%',width:210,padding:12,borderRadius:16,backgroundColor:'#EDF0F6'},hintText:{color:'#233049',fontSize:12,lineHeight:18},
  modal:{flex:1,justifyContent:'flex-end',alignItems:'center',backgroundColor:'#0009'},panel:{width:'100%',maxWidth:460,borderTopLeftRadius:28,borderTopRightRadius:28,backgroundColor:'#101726',overflow:'hidden'},
  heading:{flexDirection:'row',alignItems:'center',gap:10},title:{color:'#F2EDE5',fontSize:24,fontWeight:'700'},secondary:{color:'#AAB8CD',fontSize:12,lineHeight:18},body:{color:'#EEF2FA',fontSize:14,lineHeight:22},
  row:{flexDirection:'row',flexWrap:'wrap',gap:8},button:{minHeight:44,paddingVertical:12,paddingHorizontal:13,borderRadius:14,backgroundColor:'#25334B',justifyContent:'center'},buttonText:{color:'#EDF2FC',fontSize:12,fontWeight:'600'},
  input:{color:'#F0F3FA',backgroundColor:'#1B273C',borderRadius:14,padding:14,fontSize:14,minHeight:48},toggle:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12},confirm:{padding:14,gap:10,borderRadius:16,backgroundColor:'#283650'},
});
