import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { getCallHistory } from '@/lib/voice/history';
import { enforceRequestRateLimit } from '@/lib/security/requestSecurity';
export const dynamic='force-dynamic';
export async function GET(request: NextRequest) {
  const session=await getApiSession(request);
  const headers={'Cache-Control':'private, no-store'};
  if(!session?.user?.id)return NextResponse.json({error:'Non authentifié'},{status:401,headers});
  const limited=enforceRequestRateLimit(request,'call-history',60,60_000,session.user.id);if(limited)return limited;
  const conversationId=request.nextUrl.searchParams.get('conversationId');
  const before=request.nextUrl.searchParams.get('before');
  if((conversationId&&!/^[a-z0-9_-]{1,128}$/i.test(conversationId))||(before&&!Number.isFinite(Date.parse(before))))return NextResponse.json({error:'Pagination invalide'},{status:400,headers});
  try{return NextResponse.json(await getCallHistory(session.user.id,conversationId,before),{headers});}
  catch {return NextResponse.json({error:'Historique momentanément indisponible'},{status:503,headers});}
}
