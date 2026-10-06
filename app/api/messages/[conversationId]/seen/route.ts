import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { queryDatabase } from '@/lib/postgres';
import { requireConversationParticipant } from '@/lib/messaging';
import { rejectUntrustedMutationOrigin, enforceRequestRateLimit } from '@/lib/security/requestSecurity';

export const dynamic = 'force-dynamic';

export async function PUT(
  request: NextRequest,
  { params }: { params: { conversationId: string } },
) {
  try {
    const origin=rejectUntrustedMutationOrigin(request);if(origin)return origin;
    const session = await getApiSession(request);
    if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    const limited=enforceRequestRateLimit(request,'message-receipt',180,60_000,session.user.id);if(limited)return limited;
    const recipient = request.headers.get('X-Synaura-Notification-User');
    if (recipient && recipient !== session.user.id) return NextResponse.json({error:'Compte de notification différent'},{status:403});
    const conversationId = params.conversationId;
    if (!await requireConversationParticipant(conversationId, session.user.id)) {
      return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });
    }

    const text = await request.text();
    if (text.length > 10000) return NextResponse.json({error:'Trop de messages'},{status:413});
    let body;try{body=text?JSON.parse(text):{};}catch{return NextResponse.json({error:'Messages invalides'},{status:400});}
    if(!body||typeof body!=='object')return NextResponse.json({error:'Messages invalides'},{status:400});
    const ids = body.messageIds;
    if (ids !== undefined && (!Array.isArray(ids) || ids.length>100 || ids.some(id=>typeof id!=='string'||!/^[a-z0-9_-]{1,128}$/i.test(id)))) {
      return NextResponse.json({error:'Messages invalides'},{status:400});
    }
    const now = new Date().toISOString();
    // Legacy clients without IDs acknowledge the current snapshot only. New clients
    // send the messages actually visible, never all rooms or newly arriving rows.
    await queryDatabase(`INSERT INTO public.message_read_receipts(message_id,user_id,read_at)
      SELECT id,$2,$3 FROM public.messages WHERE conversation_id=$1 AND sender_id<>$2
      AND created_at<=$3 AND ($4::text[] IS NULL OR id=ANY($4::text[]))
      ON CONFLICT DO NOTHING`,[conversationId,session.user.id,now,ids ?? null]);
    return NextResponse.json({ success: true, seenAt: now });
  } catch (error) {
    console.error('[messages/seen] failed:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
