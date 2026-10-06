let current:{conversationId:string;userId:string;roomId:string|null}|null=null;
export function setVisibleConversation(value:typeof current){current=value;}
export function isVisibleConversation(data:Record<string,unknown>){
  return Boolean(current&&data.conversation_id===current.conversationId&&data.recipient_id===current.userId&&(data.room_id||null)===current.roomId);
}
