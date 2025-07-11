import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Track from '@/models/Track';
import User from '@/models/User';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    // Récupérer les statistiques depuis la base de données
    const [
      tracksCount,
      artistsCount,
      totalPlays,
      totalLikes
    ] = await Promise.all([
      // Nombre total de tracks
      Track.countDocuments(),
      
      // Nombre d'artistes uniques
      User.countDocuments({ isArtist: true }),
      
      // Total des écoutes
      Track.aggregate([
        {
          $group: {
            _id: null,
            totalPlays: { $sum: '$plays' }
          }
        }
      ]).then((result: any[]) => result[0]?.totalPlays || 0),
      
      // Total des likes
      Track.aggregate([
        {
          $group: {
            _id: null,
            totalLikes: { $sum: { $size: '$likes' } }
          }
        }
      ]).then((result: any[]) => result[0]?.totalLikes || 0)
    ]);

    // Calculer les tendances (simulation pour l'instant)
    const trends = {
      tracks: Math.floor(Math.random() * 20) + 5, // +5 à +25%
      artists: Math.floor(Math.random() * 15) + 3, // +3 à +18%
      totalPlays: Math.floor(Math.random() * 30) + 10, // +10 à +40%
      totalLikes: Math.floor(Math.random() * 25) + 8 // +8 à +33%
    };

    return NextResponse.json({
      success: true,
      data: {
        tracks: tracksCount,
        artists: artistsCount,
        totalPlays: totalPlays,
        totalLikes: totalLikes,
        trends,
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erreur lors de la récupération des statistiques',
        data: {
          tracks: 0,
          artists: 0,
          totalPlays: 0,
          totalLikes: 0,
          trends: {
            tracks: 0,
            artists: 0,
            totalPlays: 0,
            totalLikes: 0
          },
          lastUpdated: new Date().toISOString()
        }
      },
      { status: 500 }
    );
  }
} 