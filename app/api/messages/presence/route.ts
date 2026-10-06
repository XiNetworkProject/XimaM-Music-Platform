import {NextRequest,NextResponse} from 'next/server';
import {getApiSession} from '@/lib/getApiSession';
import {queryDatabase} from '@/lib/postgres';
import {enforceRequestRateLimit,readLimitedJson,rejectUntrustedMutationOrigin} from '@/lib/security/requestSecurity';
export const dynamic='force-dynamic';
export async function POST(request:NextRequest){
  const origin=rejectUntrustedMutationOrigin(request);if(origin)return origin;
  const session=await getApiSession(request);if(!session?.user?.id)return NextResponse.json({error:'Non authentifié'},{status:401});
  const limited=enforceRequestRateLimit(request,'messaging-presence',12,60_000,session.user.id);if(limited)return limited;
  const parsed=await readLimitedJson<Record<string,unknown>>(request,1024);if(!parsed.ok)return parsed.response;
  const {device,active}=parsed.value;if(typeof device!=='string'||!/^[a-f0-9-]{36}$/i.test(device)||typeof active!=='boolean')return NextResponse.json({error:'Présence invalide'},{status:400});
  try{
    await queryDatabase(`INSERT INTO public.messaging_presence(user_id,device_id,last_active_at,expires_at)
      VALUES($1,$2,now(),CASE WHEN $3 THEN now()+interval '45 seconds' ELSE now() END)
      ON CONFLICT(user_id,device_id) DO UPDATE SET expires_at=EXCLUDED.expires_at,
      last_active_at=CASE WHEN $3 THEN now() ELSE messaging_presence.last_active_at END`,[session.user.id,device,active]);
    await queryDatabase(`DELETE FROM public.messaging_presence WHERE expires_at<now()-interval '1 day' AND user_id=$1`,[session.user.id]);
    if(active)await queryDatabase(`UPDATE public.profiles SET last_seen=now() WHERE id=$1 AND (last_seen IS NULL OR last_seen<now()-interval '1 minute')`,[session.user.id]);
    return NextResponse.json({ok:true},{headers:{'Cache-Control':'private, no-store'}});
  }catch{return NextResponse.json({error:'Présence indisponible'},{status:503});}
}
