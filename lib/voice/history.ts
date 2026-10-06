import 'server-only';
import { queryDatabase, withDatabaseTransaction } from '@/lib/postgres';
import { messagingIso } from '@/lib/messagingTime';
import type { VoiceCall } from './callRegistry';

export async function saveCallHistory(call: VoiceCall) {
  await withDatabaseTransaction(async client => {
    await client.query(`INSERT INTO public.voice_call_history
      (id,conversation_id,caller_id,title,is_group,created_at,connected_at,ended_at,last_activity_at,end_reason)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      ON CONFLICT (id) DO UPDATE SET connected_at=COALESCE(voice_call_history.connected_at,EXCLUDED.connected_at),
      ended_at=COALESCE(voice_call_history.ended_at,EXCLUDED.ended_at),
      last_activity_at=EXCLUDED.last_activity_at,end_reason=EXCLUDED.end_reason`,
      [call.id,call.conversationId,call.callerId,call.title,call.group,new Date(call.created).toISOString(),
       call.connectedAt ? new Date(call.connectedAt).toISOString() : null,call.endedAt ? new Date(call.endedAt).toISOString() : null,
       new Date(Math.max(call.created,...call.members.map(member=>member.seen))).toISOString(),call.reason||null]);
    await client.query(`INSERT INTO public.voice_call_members(call_id,user_id,name,state,joined_at,left_at)
      SELECT $1, member.id::uuid,member.name,member.state,member.joined_at,member.left_at
      FROM jsonb_to_recordset($2::jsonb) AS member(id text,name text,state text,joined_at timestamptz,left_at timestamptz)
      ON CONFLICT (call_id,user_id) DO UPDATE SET state=EXCLUDED.state,joined_at=EXCLUDED.joined_at,left_at=EXCLUDED.left_at`,
      [call.id,JSON.stringify(call.members.map(({id,name,state,joinedAt,leftAt})=>({id,name,state,joined_at:joinedAt?new Date(joinedAt).toISOString():null,left_at:leftAt?new Date(leftAt).toISOString():null})))]);
  });
}

export async function closeInterruptedCallHistory() {
  // A restart cannot resume this process's RTC leases. Do not count offline time.
  await queryDatabase(`UPDATE public.voice_call_history SET ended_at=GREATEST(created_at,last_activity_at,connected_at),
    end_reason='server-restarted' WHERE ended_at IS NULL`);
}

export async function getCallHistory(userId: string, conversationId: string | null, before: string | null) {
  const {rows}=await queryDatabase(`SELECT h.*, mine.state AS my_state,mine.joined_at AS my_joined_at,mine.left_at AS my_left_at,
    (SELECT jsonb_agg(jsonb_build_object('id',m.user_id,'name',m.name,'state',m.state))
      FROM public.voice_call_members m WHERE m.call_id=h.id) AS members
    FROM public.voice_call_history h JOIN public.voice_call_members mine ON mine.call_id=h.id AND mine.user_id=$1
    WHERE ($2::uuid IS NULL OR h.conversation_id=$2) AND ($3::timestamptz IS NULL OR h.created_at<$3)
    ORDER BY h.created_at DESC,h.id DESC LIMIT 51`,[userId,conversationId,before]);
  const calls=rows.slice(0,50).map(row=>{
    const connected=messagingIso(row.connected_at), ended=messagingIso(row.ended_at);
    const outgoing=row.caller_id===userId;
    const participated=Boolean(row.my_joined_at);
    const outcome=!ended?'ongoing':connected&&participated?'completed':row.my_state==='declined'||row.end_reason==='decline'?'declined':row.end_reason==='service-unavailable'?'failed':outgoing?'cancelled':'missed';
    return {id:row.id,conversationId:row.conversation_id,callerId:row.caller_id,title:row.title,group:row.is_group,
      direction:outgoing?'outgoing':'incoming',outcome,createdAt:messagingIso(row.created_at),connectedAt:connected,endedAt:ended,
      durationSeconds:connected&&ended&&participated?Math.max(0,Math.floor((Math.min(Date.parse(ended),Date.parse(messagingIso(row.my_left_at)||ended))-Math.max(Date.parse(connected),Date.parse(messagingIso(row.my_joined_at)||connected)))/1000)):null,members:row.members};
  });
  return {calls,nextCursor:rows.length>50?calls.at(-1)?.createdAt:null};
}
