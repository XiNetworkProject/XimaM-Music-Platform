import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { DeviceEventEmitter } from 'react-native';
import { API_BASE_URL } from '@/api/client';
import { getStoredMobileAccessToken } from './messageNotificationReply';
export const CALL_CATEGORY='synaura_call';
export const ANSWER_CALL='answer_call';
export const DECLINE_CALL='decline_call';
export const CALL_NOTIFICATION_EVENT='synaura:call-notification';
const KEY='synaura.call.notification-intent.v1';
const HANDLED_KEY='synaura.call.notification-handled.v1';
type Intent={id:string;recipient:string;expires:number;answer:boolean};
let handling: Promise<boolean> | null=null;
export async function pendingCallIntent(userId:string):Promise<Intent|null>{
  const raw=await AsyncStorage.getItem(KEY);if(!raw)return null;
  let value:Intent;try{value=JSON.parse(raw) as Intent;}catch{await AsyncStorage.removeItem(KEY);return null;}
  if(!value||value.recipient!==userId||!Number.isFinite(value.expires)||value.expires<=Date.now()){await AsyncStorage.removeItem(KEY);return null;}
  return value;
}
export const clearCallIntent=()=>AsyncStorage.removeItem(KEY);
export async function dismissCallNotifications(callId:string){
  const items=await Notifications.getPresentedNotificationsAsync();
  await Promise.all(items.filter(item=>item.request.content.data?.call_id===callId).map(item=>Notifications.dismissNotificationAsync(item.request.identifier)));
}
export async function handleCallNotificationResponse(response:Notifications.NotificationResponse){
  const data=response.notification.request.content.data;
  if(data?.kind!=='incoming_call')return false;
  if(handling){await handling.catch(()=>{});return handleCallNotificationResponse(response);}
  handling=(async()=>{
    const id=String(data.call_id||''),recipient=String(data.recipient_id||''),expires=Number(data.expires_at);
    if(!/^[a-f0-9-]{36}$/i.test(id)||!recipient||!Number.isFinite(expires)||expires<=Date.now()){
      await Notifications.dismissNotificationAsync(response.notification.request.identifier).catch(()=>{});return true;
    }
    const responseKey=`${id}:${recipient}:${response.actionIdentifier}`;
    let handled:Array<{key:string;expires:number}>=[];
    try{const raw=JSON.parse(await AsyncStorage.getItem(HANDLED_KEY)||'[]');if(Array.isArray(raw))handled=raw.filter(item=>item?.expires>Date.now());}catch{}
    if(handled.some(item=>item.key===responseKey))return true;
    if(response.actionIdentifier===DECLINE_CALL){
      let token=await getStoredMobileAccessToken();
      const send=()=>fetch(`${API_BASE_URL}/api/messages/calls`,{method:'POST',signal:AbortSignal.timeout(12000),
        headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`,'X-Synaura-Notification-User':recipient},
        body:JSON.stringify({action:'decline',callId:id,device:globalThis.crypto.randomUUID()})});
      if(!token)throw new Error('Reconnecte-toi pour gérer cet appel.');
      let result=await send();if(result.status===401){token=await getStoredMobileAccessToken(true);if(token)result=await send();}
      if(!result.ok&&![404,410].includes(result.status))throw new Error('Le refus de l’appel n’a pas pu être envoyé.');
      await clearCallIntent();
    }else{
      await AsyncStorage.setItem(KEY,JSON.stringify({id,recipient,expires,answer:response.actionIdentifier===ANSWER_CALL}));
      DeviceEventEmitter.emit(CALL_NOTIFICATION_EVENT);
    }
    await Notifications.dismissNotificationAsync(response.notification.request.identifier).catch(()=>{});
    await AsyncStorage.setItem(HANDLED_KEY,JSON.stringify([...handled,{key:responseKey,expires}].slice(-32)));
    return true;
  })();
  try{return await handling;}finally{handling=null;}
}
