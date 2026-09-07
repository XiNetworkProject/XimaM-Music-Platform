import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { getAdminGuard } from '@/lib/admin';
import { getEntitlements } from '@/lib/entitlements';
import { dbAdmin } from '@/lib/database';
import { isLocalMediaKind, storeRequestBody, type LocalMediaKind } from '@/lib/localMediaStorage';
import { enforceRequestRateLimit, rejectUntrustedMutationOrigin } from '@/lib/security/requestSecurity';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PUBLIC_KINDS = new Set<LocalMediaKind>(['star-academy-audio']);
const ADMIN_KINDS = new Set<LocalMediaKind>(['editorial-audio', 'editorial-image']);
const PLAN_LIMITED_KINDS = new Set<LocalMediaKind>(['audio', 'ai-audio']);

export async function POST(request: NextRequest) {
  try {
    const originError = rejectUntrustedMutationOrigin(request);
    if (originError) return originError;
    const kindParam = request.nextUrl.searchParams.get('kind') || '';
    if (!isLocalMediaKind(kindParam)) {
      return NextResponse.json({ error: 'Type de media invalide' }, { status: 400 });
    }
    const kind = kindParam as LocalMediaKind;
    if (kind === 'star-academy-audio') {
      const publicUploadLimit = enforceRequestRateLimit(request, 'upload-star-academy-ip', 3, 60 * 60_000);
      if (publicUploadLimit) return publicUploadLimit;
    }
    const session = await getApiSession(request);
    if (!session?.user?.id && !PUBLIC_KINDS.has(kind)) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    }
    if (session?.user?.id) {
      const userUploadLimit = enforceRequestRateLimit(request, 'upload-media-user', 30, 60 * 60_000, session.user.id);
      if (userUploadLimit) return userUploadLimit;
    }
    if (ADMIN_KINDS.has(kind)) {
      const guard = await getAdminGuard();
      if (!guard.ok) return NextResponse.json({ error: 'Acces administrateur requis' }, { status: 403 });
    }
    if (kind === 'star-academy-audio') {
      const { data: rows, error } = await dbAdmin.from('star_academy_config').select('key, value');
      const config = Object.fromEntries((rows || []).map((row: any) => [row.key, row.value]));
      const deadline = config.deadline ? new Date(config.deadline) : null;
      if (deadline) deadline.setDate(deadline.getDate() + 15);
      if (error || config.is_open !== 'true' || (deadline && Number.isFinite(deadline.getTime()) && new Date() > deadline)) {
        return NextResponse.json({ error: 'Les inscriptions sont fermees' }, { status: 403 });
      }
    }

    if (!request.body) {
      return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 });
    }

    const encodedName = request.headers.get('x-file-name') || '';
    let originalName = 'upload.bin';
    try {
      originalName = decodeURIComponent(encodedName) || originalName;
    } catch {
      originalName = encodedName || originalName;
    }

    const contentType = request.headers.get('content-type') || 'application/octet-stream';
    const declaredLength = Number(request.headers.get('content-length') || request.headers.get('x-file-size') || 0) || null;
    let planMaxBytes: number | undefined;
    if (session?.user?.id && PLAN_LIMITED_KINDS.has(kind)) {
      const { data: profile } = await dbAdmin.from('profiles').select('plan').eq('id', session.user.id).maybeSingle();
      const entitlements = getEntitlements((profile?.plan || 'free') as any);
      planMaxBytes = entitlements.uploads.maxFileMb * 1024 * 1024;
    }

    const media = await storeRequestBody({
      kind,
      originalName,
      contentType,
      body: request.body,
      contentLength: declaredLength,
      maxBytes: planMaxBytes,
      ownerId: session?.user?.id || null,
    });

    return NextResponse.json({
      success: true,
      ...media,
      storage: 'local',
    });
  } catch (error: any) {
    console.error('Erreur upload media local');
    const message = String(error?.message || 'Erreur lors de l upload du fichier');
    const status = message.includes('trop volumineux') ? 413 : /supporte|extension|MIME|contenu|fichier est vide/i.test(message) ? 415 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
