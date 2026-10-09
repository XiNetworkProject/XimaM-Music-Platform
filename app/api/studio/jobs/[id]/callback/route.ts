import { NextRequest } from 'next/server';
import { verifySunoCallback } from '@/lib/sunoWebhook';
import { bindProviderTask, refreshStudioJob } from '@/lib/studio/jobs';
import { readLimitedJson } from '@/lib/security/requestSecurity';
export const dynamic = 'force-dynamic';
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!verifySunoCallback(req)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!/^[\da-f-]{36}$/i.test(params.id)) return Response.json({ error: 'Invalid id' }, { status: 400 });
  const parsed = await readLimitedJson<any>(req, 512 * 1024); if (!parsed.ok) return parsed.response;
  const task = parsed.value?.data?.task_id || parsed.value?.data?.taskId || parsed.value?.task_id;
  if (typeof task !== 'string' || !task || task.length > 255) return Response.json({ error: 'Missing task id' }, { status: 400 });
  try {
    // The per-job signed callback can arrive before the create HTTP response.
    await bindProviderTask(params.id, task);
    await refreshStudioJob(params.id);
    return Response.json({ received: true });
  } catch { return Response.json({ error: 'Callback not reconciled' }, { status: 503 }); }
}
