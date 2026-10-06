import 'server-only';
import { createNotification, sendCallPush } from '@/lib/notifications';
import { CALL_RING_MS, type VoiceCall } from './callRegistry';
export async function notifyCallLifecycle(call: VoiceCall, event: 'incoming' | 'answered' | 'ended') {
  const caller=call.members.find(member=>member.id===call.callerId)?.name || 'Un ami';
  // Push delivery must never break signalling. Metadata contains no RTC credential.
  await Promise.allSettled(call.members.filter(member=>member.id!==call.callerId).map(async member=>{
    if(event==='answered'&&member.state!=='joined')return;
    const data={call_id:call.id,conversation_id:call.conversationId,recipient_id:member.id,
      expires_at:call.created+CALL_RING_MS,caller_name:caller};
    const url=`/messages/${call.conversationId}?call=${call.id}`;
    if(event==='incoming')await sendCallPush(member.id,caller,call.group?call.title:'Appel vocal entrant',url,{...data,kind:'incoming_call'});
    else if(member.state==='invited')await createNotification({userId:member.id,type:'new_message',title:'Appel manqué',message:`${caller}${call.group?' · '+call.title:''}`,actionUrl:`/messages/${call.conversationId}?calls=1`,relatedId:call.id,dedupeOnRelatedId:true,data:{...data,kind:'missed_call'}});
    else await sendCallPush(member.id,event==='answered'?'Appel pris en charge':'Appel terminé',caller,`/messages/${call.conversationId}?calls=1`,{...data,kind:'call_ended'});
  }));
}
