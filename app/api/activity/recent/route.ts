import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Utilisateur non connecté' },
        { status: 401 }
      );
    }

    // Récupérer l'utilisateur depuis Supabase
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', session.user.email)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    // Activités des artistes suivis (mock pour l'instant)
    const followedActivities = [
      {
        artist: 'Luna Sky',
        action: 'a partagé une nouvelle création',
        track: 'Midnight Dreams',
        time: 'Il y a 2h',
        avatar: '/default-avatar.png',
        color: 'from-purple-500 to-pink-500',
        type: 'new_track'
      },
      {
        artist: 'DJ Nova',
        action: 'a commencé un live',
        track: 'Session Lo-Fi',
        time: 'Il y a 4h',
        avatar: '/default-avatar.png',
        color: 'from-blue-500 to-cyan-500',
        type: 'live_started'
      },
      {
        artist: 'The Groove Collective',
        action: 'a aimé votre création',
        track: 'Summer Vibes',
        time: 'Il y a 6h',
        avatar: '/default-avatar.png',
        color: 'from-green-500 to-emerald-500',
        type: 'liked_track'
      }
    ];

    // Notifications système
    const systemNotifications = [
      {
        type: 'Nouvelle fonctionnalité',
        title: 'Playlists collaboratives disponibles',
        description: 'Créez des playlists avec vos amis en temps réel',
        time: 'Il y a 1h',
        icon: 'Gift',
        color: 'from-yellow-500 to-orange-500',
        priority: 'high'
      },
      {
        type: 'Mise à jour',
        title: 'Nouveau design disponible',
        description: 'Interface améliorée et nouvelles animations',
        time: 'Il y a 3h',
        icon: 'RefreshCw',
        color: 'from-green-500 to-emerald-500',
        priority: 'medium'
      },
      {
        type: 'Événement',
        title: 'Concert virtuel ce soir',
        description: 'Rejoignez le live de Luna Sky à 20h',
        time: 'Il y a 5h',
        icon: 'Radio',
        color: 'from-red-500 to-pink-500',
        priority: 'high'
      }
    ];

    // Activités récentes de l'utilisateur depuis Supabase
    const { data: userRecentTracks, error: tracksError } = await supabase
      .from('tracks')
      .select('*')
      .eq('creator_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (tracksError) {
      console.error('❌ Erreur lors de la récupération des tracks:', tracksError);
    }

    const userActivities = (userRecentTracks || []).map((track: any) => ({
      type: 'user_upload',
      title: `Vous avez partagé "${track.title}"`,
      time: formatTimeAgo(track.created_at),
      track: track.title,
      color: 'from-indigo-500 to-purple-500'
    }));

    return NextResponse.json({
      followedActivities,
      systemNotifications,
      userActivities,
      totalActivities: followedActivities.length + systemNotifications.length + userActivities.length
    });
  } catch (error) {
    console.error('Erreur activité récente:', error);
    return NextResponse.json(
      { error: 'Erreur lors du chargement de l\'activité' },
      { status: 500 }
    );
  }
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
  
  if (diffHours < 1) return 'Il y a quelques minutes';
  if (diffHours === 1) return 'Il y a 1h';
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays === 1) return 'Hier';
  if (diffDays <= 7) return `Il y a ${diffDays} jours`;
  
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
} 