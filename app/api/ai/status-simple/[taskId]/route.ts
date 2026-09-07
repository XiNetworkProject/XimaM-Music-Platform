import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { dbAdmin } from '@/lib/database';
import { handleSunoStatusRequest } from '@/lib/security/criticalRouteHandlers';
import { consumeRateLimit } from '@/lib/security/rateLimit';

export const dynamic = 'force-dynamic';

async function getAuthenticatedUserId() {
  const session = await getServerSession(authOptions);
  return session?.user?.id || null;
}

async function ownsSunoTask(userId: string, taskId: string) {
  const { data, error } = await dbAdmin
    .from('ai_generations')
    .select('id')
    .eq('task_id', taskId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new Error('Suno task ownership lookup failed');
  return Boolean(data?.id);
}

async function fetchSunoStatus(taskId: string) {
  const apiKey = process.env.SUNO_API_KEY;
  if (!apiKey) throw new Error('Suno status unavailable');

  const response = await fetch(`https://api.sunoapi.org/api/v1/generate/${encodeURIComponent(taskId)}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) throw new Error('Suno upstream request failed');
  return response.json();
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { taskId: string } },
) {
  return handleSunoStatusRequest(params.taskId, {
    getUserId: getAuthenticatedUserId,
    ownsTask: ownsSunoTask,
    consumeRateLimit,
    fetchStatus: fetchSunoStatus,
    reportFailure: (event) => {
      console.error('[ai/status-simple] request failed', { event });
    },
  });
}
