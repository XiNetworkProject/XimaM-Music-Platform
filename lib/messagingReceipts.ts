import 'server-only';
import { queryDatabase } from '@/lib/postgres';

export async function getMessageReceipts(messageIds: string[]) {
  if (!messageIds.length) return new Map<string,string[]>();
  const {rows}=await queryDatabase('SELECT message_id,user_id FROM public.message_read_receipts WHERE message_id=ANY($1::uuid[])',[messageIds]);
  const receipts=new Map<string,string[]>();
  for (const row of rows) receipts.set(row.message_id,[...(receipts.get(row.message_id)||[]),row.user_id]);
  return receipts;
}

export async function getUnreadMessages(userId: string, conversationIds: string[]) {
  if (!conversationIds.length) return [];
  const {rows}=await queryDatabase(`SELECT m.conversation_id,count(*)::int AS count FROM public.messages m
    JOIN public.conversation_participants p ON p.conversation_id=m.conversation_id AND p.user_id=$1
    WHERE m.conversation_id=ANY($2::uuid[]) AND m.sender_id<>$1 AND m.deleted_at IS NULL
      AND NOT EXISTS (SELECT 1 FROM public.message_read_receipts r WHERE r.message_id=m.id AND r.user_id=$1)
      AND NOT EXISTS (SELECT 1 FROM public.message_hidden_users h WHERE h.message_id=m.id AND h.user_id=$1)
    GROUP BY m.conversation_id`,[userId,conversationIds]);
  return rows as {conversation_id:string;count:number}[];
}
