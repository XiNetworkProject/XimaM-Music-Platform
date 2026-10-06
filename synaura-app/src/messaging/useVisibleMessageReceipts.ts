import {useCallback,useEffect,useRef} from 'react';
import {AppState} from 'react-native';
import {markConversationSeen,type MessagingMessage} from '@/api/client';
import * as Notifications from 'expo-notifications';
import {setVisibleConversation} from './visibleConversation';

// FlashList reports actual viewport items; fetching/cache hydration is not reading.
export function useVisibleMessageReceipts(conversationId:string,userId:string|undefined,focused:boolean,roomId?:string|null){
  const visible=useRef(new Map<string,{message:MessagingMessage;since:number}>());
  const acknowledged=useRef(new Set<string>());
  const identity=useRef('');
  const nextIdentity=`${userId}:${conversationId}:${roomId||''}`;
  if(identity.current!==nextIdentity){identity.current=nextIdentity;visible.current.clear();acknowledged.current.clear();}
  const onViewableItemsChanged=useCallback(({viewableItems}:{viewableItems:Array<{item:MessagingMessage}>})=>{
    const now=Date.now(),previous=visible.current;
    visible.current=new Map(viewableItems.map(({item})=>[item.id,{message:item,since:previous.get(item.id)?.since||now}]));
  },[]);
  useEffect(()=>{
    if(!focused||!userId||!conversationId)return;
    visible.current.forEach(value=>{value.since=Date.now();});
    setVisibleConversation({conversationId,userId,roomId:roomId||null});
    let busy=false,cancelled=false;
    const clear=AppState.addEventListener('change',state=>{if(state!=='active')visible.current.forEach(value=>{value.since=Infinity;});else visible.current.forEach(value=>{value.since=Date.now();});});
    const timer=setInterval(()=>{
      if(busy||AppState.currentState!=='active')return;
      const ids=[...visible.current.values()].filter(({message,since})=>Date.now()-since>=500&&message.sender.id!==userId&&!message.seenBy.includes(userId)&&!acknowledged.current.has(message.id)).map(({message})=>message.id).slice(0,100);
      if(!ids.length)return;busy=true;
      void markConversationSeen(conversationId,ids).then(async()=>{
        if(!cancelled)ids.forEach(id=>acknowledged.current.add(id));
        const notifications=await Notifications.getPresentedNotificationsAsync();
        await Promise.all(notifications.filter(item=>item.request.content.data?.recipient_id===userId&&ids.includes(String(item.request.content.data?.message_id))).map(item=>Notifications.dismissNotificationAsync(item.request.identifier)));
      }).catch(()=>{}).finally(()=>{busy=false;});
    },800);
    return()=>{cancelled=true;clearInterval(timer);clear.remove();setVisibleConversation(null);};
  },[conversationId,userId,focused,roomId]);
  return onViewableItemsChanged;
}
