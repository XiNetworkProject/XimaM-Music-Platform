import React,{useEffect,useRef,useState} from 'react';
import {Modal,ScrollView,Text,View,ActivityIndicator,StyleSheet} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Ionicons} from '@expo/vector-icons';
import {useNavigation} from '@react-navigation/native';
import {getCallHistory,type CallHistoryEntry} from '@/api/client';
import {useAuth} from '@/auth/AuthProvider';
import {useNativeCalls} from '@/calls/NativeCallProvider';
import {EntryPressable} from '@/components/entry/EntryPressable';
import {useMessagingColors} from './useMessagingColors';
const labels:Record<string,string>={ongoing:'En cours',completed:'Terminé',missed:'Manqué',cancelled:'Sans réponse',declined:'Refusé',failed:'Impossible'};
export function CallHistory({conversationId,initiallyOpen=false}:{conversationId?:string;initiallyOpen?:boolean}){
  const colors=useMessagingColors(),insets=useSafeAreaInsets(),auth=useAuth(),voice=useNativeCalls(),navigation=useNavigation<any>();
  const generation=useRef(0);
  const [open,setOpen]=useState(false),[items,setItems]=useState<CallHistoryEntry[]>([]),[cursor,setCursor]=useState<string|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(false);
  useEffect(()=>{if(initiallyOpen)setOpen(true);},[initiallyOpen]);
  useEffect(()=>{generation.current++;if(!open)return;let cancelled=false;setLoading(true);setError('');setItems([]);setCursor(null);
    void getCallHistory(conversationId).then(data=>{if(!cancelled){setItems(data.calls);setCursor(data.nextCursor);}}).catch(()=>{if(!cancelled)setError('Historique indisponible. Réessaie.');}).finally(()=>{if(!cancelled)setLoading(false);});
    return()=>{generation.current++;cancelled=true;};
  },[open,conversationId,auth.user?.id]);
  const more=async()=>{if(!cursor||loading)return;const epoch=generation.current;setLoading(true);try{const data=await getCallHistory(conversationId,cursor);if(epoch!==generation.current)return;setItems(old=>Array.from(new Map([...old,...data.calls].map(item=>[item.id,item])).values()));setCursor(data.nextCursor);}catch{if(epoch===generation.current)setError('Chargement impossible. Réessaie.');}finally{if(epoch===generation.current)setLoading(false);}};
  return <><EntryPressable accessibilityRole="button" accessibilityLabel="Historique des appels" onPress={()=>setOpen(true)} style={s.open}><Ionicons name="call-outline" size={19} color={colors.text}/><Text style={{color:colors.text}}>Appels</Text></EntryPressable>
    <Modal visible={open} transparent animationType="slide" onRequestClose={()=>setOpen(false)}>
      <View style={{flex:1,backgroundColor:'rgba(0,0,0,.6)',justifyContent:'flex-end'}}>
        <EntryPressable style={{flex:1}} accessibilityLabel="Fermer l’historique" onPress={()=>setOpen(false)}/>
        <View style={{backgroundColor:colors.background,maxHeight:'85%',borderTopLeftRadius:28,borderTopRightRadius:28,padding:20,paddingBottom:Math.max(20,insets.bottom)}}>
          <View style={s.header}><Text accessibilityRole="header" style={{fontSize:23,fontWeight:'700',color:colors.text,flex:1}}>Historique des appels</Text><EntryPressable accessibilityLabel="Fermer" onPress={()=>setOpen(false)} style={s.action}><Ionicons name="close" size={24} color={colors.text}/></EntryPressable></View>
          <ScrollView contentContainerStyle={{gap:8,paddingBottom:20}}>
            {items.map(item=>{const name=item.group?item.title:item.members.find(person=>person.id!==auth.user?.id)?.name||item.title;return <View key={item.id} style={[s.row,{backgroundColor:colors.surface}]}>
              <Ionicons name={item.direction==='outgoing'?'arrow-up-outline':'arrow-down-outline'} size={20} color={item.outcome==='missed'?colors.danger:colors.textSecondary}/>
              <EntryPressable accessibilityLabel={'Discussion avec '+name} onPress={()=>{setOpen(false);navigation.navigate('Conversation',{conversationId:item.conversationId});}} style={{flex:1,gap:4}}>
                <Text numberOfLines={1} style={{color:colors.text,fontWeight:'600'}}>{name}</Text><Text style={{color:colors.textSecondary,fontSize:12}}>{item.direction==='outgoing'?'Sortant':'Entrant'} · {labels[item.outcome]}{item.durationSeconds!==null?` · ${Math.floor(item.durationSeconds/60)} min ${item.durationSeconds%60} s`:''}</Text><Text style={{color:colors.textTertiary,fontSize:11}}>{new Date(item.createdAt).toLocaleString('fr-FR')}</Text>
              </EntryPressable><EntryPressable accessibilityLabel={'Rappeler '+name} disabled={!voice.enabled||voice.busy} style={s.action} onPress={()=>{setOpen(false);voice.start(item.conversationId);}}><Ionicons name="call-outline" size={21} color={voice.enabled?colors.text:colors.textTertiary}/></EntryPressable>
            </View>;})}
            {loading&&<ActivityIndicator color={colors.text}/>}<Text accessibilityLiveRegion="polite" style={{color:error?colors.danger:colors.textSecondary,textAlign:'center'}}>{error||(!loading&&!items.length?'Aucun appel enregistré pour le moment.':'')}</Text>
            {cursor&&<EntryPressable disabled={loading} onPress={()=>void more()} style={s.open}><Text style={{color:colors.text}}>Appels précédents</Text></EntryPressable>}
            {error&&!items.length&&<EntryPressable onPress={()=>{setOpen(false);setTimeout(()=>setOpen(true),0);}} style={s.open}><Text style={{color:colors.text}}>Réessayer</Text></EntryPressable>}
          </ScrollView>
        </View>
      </View>
    </Modal></>;
}
const s=StyleSheet.create({open:{minHeight:44,flexDirection:'row',gap:8,alignItems:'center',paddingHorizontal:12},header:{flexDirection:'row',alignItems:'center',marginBottom:12},row:{flexDirection:'row',alignItems:'center',gap:10,padding:12,borderRadius:18},action:{width:44,height:44,alignItems:'center',justifyContent:'center'}});
