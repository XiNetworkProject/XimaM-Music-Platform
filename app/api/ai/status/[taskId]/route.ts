import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { dbAdmin } from '@/lib/database';
import { enforceRequestRateLimit, isSafeOpaqueIdentifier } from '@/lib/security/requestSecurity';

export async function GET(
  request: NextRequest,
  { params }: { params: { taskId: string } },
) {
  const session = await getApiSession(request);
  if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
  const taskId = params.taskId?.trim() || '';
  if (!isSafeOpaqueIdentifier(taskId)) return NextResponse.json({ error: 'Task ID invalide' }, { status: 400 });
  const limited = enforceRequestRateLimit(request, 'ai-legacy-status-user', 20, 60_000, session.user.id);
  if (limited) return limited;

  const { data: generation, error } = await dbAdmin
    .from('ai_generations')
    .select('id, status')
    .eq('task_id', taskId)
    .eq('user_id', session.user.id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: 'Verification impossible' }, { status: 500 });
  if (!generation) return NextResponse.json({ error: 'Generation introuvable' }, { status: 404 });

  return NextResponse.json({
    taskId,
    status: generation.status || 'pending',
    audioUrls: [],
    callbackType: 'pending',
    message: 'Generation suivie via webhook',
  });
}

export const dynamic = 'force-dynamic';
