import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions).catch(() => null);
    const userId = (session?.user as any)?.id;

    if (!userId) {
      return NextResponse.json({ following: [] });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);

    const { data: follows, error } = await supabaseAdmin
      .from('user_follows')
      .select('following_id')
      .eq('follower_id', userId)
      .limit(limit);

    if (error || !follows?.length) {
      return NextResponse.json({ following: [] });
    }

    const followingIds = follows.map(f => f.following_id);

    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, username, name, avatar, is_artist, artist_name, is_verified, total_plays, follower_count')
      .in('id', followingIds);

    const formatted = (profiles || []).map(p => ({
      _id: p.id,
      id: p.id,
      username: p.username,
      name: p.name,
      avatar: p.avatar,
      isArtist: p.is_artist,
      artistName: p.artist_name,
      isVerified: p.is_verified,
      totalPlays: p.total_plays || 0,
      followerCount: p.follower_count || 0,
    }));

    return NextResponse.json({ following: formatted });
  } catch (error) {
    console.error('Erreur /api/users/following:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
