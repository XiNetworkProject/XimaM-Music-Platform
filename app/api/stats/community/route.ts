import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Track from '@/models/Track';
import User from '@/models/User';

export async function GET() {
  try {
    await dbConnect();

    // Récupérer les statistiques en temps réel
    const [
      totalTracks,
      totalUsers,
      totalLikes,
      totalPlays
    ] = await Promise.all([
      Track.countDocuments(),
      User.countDocuments(),
      Track.aggregate([
        { $group: { _id: null, totalLikes: { $sum: { $size: '$likes' } } } }
      ]),
      Track.aggregate([
        { $group: { _id: null, totalPlays: { $sum: '$plays' } } }
      ])
    ]);

    // Calculer les totaux
    const totalLikesCount = totalLikes[0]?.totalLikes || 0;
    const totalPlaysCount = totalPlays[0]?.totalPlays || 0;

    // Statistiques avec formatage
    const stats = [
      {
        icon: 'Music',
        label: 'Créations',
        value: totalTracks.toLocaleString('fr-FR'),
        color: 'from-purple-500 to-pink-500',
        growth: '+12% ce mois'
      },
      {
        icon: 'Users',
        label: 'Artistes',
        value: totalUsers.toLocaleString('fr-FR'),
        color: 'from-blue-500 to-cyan-500',
        growth: '+8% ce mois'
      },
      {
        icon: 'Heart',
        label: 'Likes',
        value: totalLikesCount >= 1000000 
          ? (totalLikesCount / 1000000).toFixed(1) + 'M'
          : totalLikesCount >= 1000 
            ? (totalLikesCount / 1000).toFixed(1) + 'K'
            : totalLikesCount.toString(),
        color: 'from-pink-500 to-rose-500',
        growth: '+15% ce mois'
      },
      {
        icon: 'Headphones',
        label: 'Écoutes',
        value: totalPlaysCount >= 1000000 
          ? (totalPlaysCount / 1000000).toFixed(1) + 'M'
          : totalPlaysCount >= 1000 
            ? (totalPlaysCount / 1000).toFixed(1) + 'K'
            : totalPlaysCount.toString(),
        color: 'from-green-500 to-emerald-500',
        growth: '+23% ce mois'
      }
    ];

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Erreur statistiques communauté:', error);
    return NextResponse.json(
      { error: 'Erreur lors du chargement des statistiques' },
      { status: 500 }
    );
  }
} 