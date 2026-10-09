import { getApiSession } from '@/lib/getApiSession';
import { NextRequest } from 'next/server';
import { STUDIO_TOOLS, approvedToolPrices, studioToolOffer } from '@/lib/studio/tools';
import { studioToolsReady } from '@/lib/studio/jobs';
export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) {
  const session = await getApiSession(req);
  if (!session?.user?.id) return Response.json({ error: 'Connexion requise.' }, { status: 401 });
  const prices = approvedToolPrices(process.env);
  const ready = Object.keys(prices).length ? await studioToolsReady().catch(() => false) : false;
  return Response.json({ tools: STUDIO_TOOLS.map(tool => ({ ...tool, ...studioToolOffer(tool.id, prices, ready) })), ready }, { headers: { 'Cache-Control': 'private, no-store' } });
}
