import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { supabaseAdmin } from '@/lib/supabase';
import {
  countMusicClipLikesStored,
  hasMusicClipLike,
  removeMusicClipLikeStored,
  setMusicClipLikeStored,
} from '@/lib/musicClipInteractionStore';

async function getPublishedClip(clipId: string) {
  const { data, error } = await supabaseAdmin
    .from('music_clips')
    .select('id, creator_id, visibility, likes_count')
    .eq('id', clipId)
    .eq('visibility', 'published')
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function countLikes(clipId: string) {
  const likesCount = await countMusicClipLikesStored(clipId);
  await supabaseAdmin.from('music_clips').update({ likes_count: likesCount }).eq('id', clipId);
  return likesCount;
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const clip = await getPublishedClip(params.id);
    if (!clip) return NextResponse.json({ error: 'Clip introuvable' }, { status: 404 });

    const session = await getApiSession(request).catch(() => null);
    const userId = session?.user?.id || null;
    let liked = false;
    if (userId) {
      liked = await hasMusicClipLike(params.id, userId);
    }
    const likesCount = await countLikes(params.id);
    return NextResponse.json({ liked, likesCount });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Impossible de charger le like' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getApiSession(request);
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    const clip = await getPublishedClip(params.id);
    if (!clip) return NextResponse.json({ error: 'Clip introuvable' }, { status: 404 });

    await setMusicClipLikeStored(params.id, userId);

    const likesCount = await countLikes(params.id);
    return NextResponse.json({ liked: true, likesCount });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Impossible de liker le clip' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getApiSession(request);
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    const clip = await getPublishedClip(params.id);
    if (!clip) return NextResponse.json({ error: 'Clip introuvable' }, { status: 404 });

    await removeMusicClipLikeStored(params.id, userId);

    const likesCount = await countLikes(params.id);
    return NextResponse.json({ liked: false, likesCount });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Impossible de retirer le like' }, { status: 500 });
  }
}
