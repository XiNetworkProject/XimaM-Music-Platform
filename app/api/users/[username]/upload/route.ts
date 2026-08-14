import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { getApiSession } from '@/lib/getApiSession';
import { deleteLocalMedia, storeWebFile } from '@/lib/localMediaStorage';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { username: string } },
) {
  const session = await getApiSession(request);
  if (!session?.user?.id) return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
  const username = params.username?.trim().toLowerCase();
  const { data: profile, error: profileError } = await db
    .from('profiles')
    .select('id, username, role')
    .eq('username', username)
    .maybeSingle();
  if (profileError || !profile) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
  if (profile.id !== session.user.id && session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Acces interdit' }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 });
    const stored = await storeWebFile(file, 'audio', 50 * 1024 * 1024, profile.id);
    const title = String(formData.get('title') || file.name).trim().slice(0, 200);
    const description = String(formData.get('description') || '').trim().slice(0, 5000);
    const genreValue = String(formData.get('genre') || '').trim();
    const { data: track, error } = await db.from('tracks').insert({
      title,
      description,
      genre: genreValue ? [genreValue] : [],
      audio_url: stored.secure_url,
      audio_public_id: stored.public_id,
      file_size: stored.bytes,
      file_type: file.type,
      duration: stored.duration || 0,
      creator_id: profile.id,
      is_public: formData.get('isPublic') === 'true',
      plays: 0,
      likes: 0,
    }).select('*').single();
    if (error || !track) {
      await deleteLocalMedia(stored.public_id).catch(() => false);
      return NextResponse.json({ error: error?.message || 'Creation de la piste impossible' }, { status: 500 });
    }
    return NextResponse.json({ success: true, track });
  } catch (error: any) {
    const message = String(error?.message || 'Upload impossible');
    const status = /trop volumineux|MIME|Extension|contenu|fichier/i.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } },
) {
  const username = params.username?.trim().toLowerCase();
  const { data: profile } = await db.from('profiles').select('id').eq('username', username).maybeSingle();
  if (!profile) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
  const session = await getApiSession(request).catch(() => null);
  let query = db.from('tracks').select('*').eq('creator_id', profile.id).order('created_at', { ascending: false });
  if (session?.user?.id !== profile.id && session?.user?.role !== 'admin') query = query.eq('is_public', true);
  const { data: tracks, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, tracks: tracks || [], count: tracks?.length || 0 });
}
