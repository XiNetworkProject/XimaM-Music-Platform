import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 API Artists Simple - Début');

    // Test de connexion basique
    console.log('🔍 Test connexion PostgreSQL...');
    const { data: testData, error: testError } = await db
      .from('profiles')
      .select('*')
      .limit(1);

    if (testError) {
      console.error('❌ Erreur connexion PostgreSQL:', testError);
      return NextResponse.json({
        error: 'Erreur connexion PostgreSQL',
        details: testError.message || testError
      }, { status: 500 });
    }

    console.log('✅ Connexion PostgreSQL OK');
    console.log('🔍 Colonnes disponibles:', Object.keys(testData[0] || {}));

    // Récupération avec les bonnes colonnes
    console.log('🔍 Récupération des profils...');
    const { data: profiles, error: profilesError } = await db
      .from('profiles')
      .select('id, username, name, avatar, bio, created_at')
      .limit(8);

    if (profilesError) {
      console.error('❌ Erreur récupération profiles:', profilesError);
      return NextResponse.json({
        error: 'Erreur récupération profiles',
        details: profilesError.message || profilesError
      }, { status: 500 });
    }

    console.log('✅ Profiles récupérés:', profiles?.length || 0);

    // Formatage avec les bonnes colonnes
    const artists = (profiles || []).map(profile => ({
      _id: profile.id,
      username: profile.username,
      name: profile.name || profile.username,
      avatar: profile.avatar || '',
      bio: profile.bio || '',
      genre: [],
      totalPlays: 0,
      totalLikes: 0,
      followerCount: 0,
      isVerified: false,
      isTrending: false,
      featuredTracks: 0,
      trackCount: 0,
      trendingScore: 0
    }));

    console.log('✅ Artistes formatés:', artists.length);
    console.log('✅ Premier artiste:', {
      name: artists[0]?.name,
      avatar: artists[0]?.avatar,
      bio: artists[0]?.bio
    });

    return NextResponse.json({
      artists: artists,
      total: artists.length,
      message: 'API simplifiée fonctionnelle'
    });

  } catch (error) {
    console.error('❌ Erreur générale:', error);
    return NextResponse.json(
      { error: 'Erreur générale', details: error },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
