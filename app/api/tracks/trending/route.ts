import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Track from '@/models/Track';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;

    // Algorithme de tendances amélioré
    const tracks = await Track.aggregate([
      {
        $addFields: {
          // Score de tendance basé sur plusieurs facteurs
          trendScore: {
            $add: [
              // Base: écoutes récentes
              { $multiply: ['$plays', 1] },
              // Engagement: likes (poids plus élevé)
              { $multiply: [{ $size: '$likes' }, 3] },
              // Bonus pour les pistes récentes (dernière semaine)
              {
                $cond: {
                  if: {
                    $gte: [
                      '$createdAt',
                      { $subtract: [new Date(), { $multiply: [7, 24, 60, 60, 1000] }] }
                    ]
                  },
                  then: { $multiply: ['$plays', 0.5] },
                  else: 0
                }
              },
              // Bonus pour les pistes très récentes (derniers 3 jours)
              {
                $cond: {
                  if: {
                    $gte: [
                      '$createdAt',
                      { $subtract: [new Date(), { $multiply: [3, 24, 60, 60, 1000] }] }
                    ]
                  },
                  then: { $multiply: ['$plays', 1] },
                  else: 0
                }
              },
              // Bonus pour les pistes avec cover (qualité visuelle)
              {
                $cond: {
                  if: { $ne: ['$coverUrl', null] },
                  then: 50,
                  else: 0
                }
              },
              // Bonus pour les pistes avec description
              {
                $cond: {
                  if: { $ne: ['$description', null] },
                  then: 25,
                  else: 0
                }
              }
            ]
          },
          // Calcul de l'âge en jours
          ageInDays: {
            $divide: [
              { $subtract: [new Date(), '$createdAt'] },
              { $multiply: [24, 60, 60, 1000] }
            ]
          }
        }
      },
      {
        $sort: { trendScore: -1 }
      },
      {
        $skip: skip
      },
      {
        $limit: limit
      },
      {
        $lookup: {
          from: 'users',
          localField: 'artist',
          foreignField: '_id',
          as: 'artistInfo'
        }
      },
      {
        $unwind: '$artistInfo'
      },
      {
        $project: {
          _id: 1,
          title: 1,
          audioUrl: 1,
          coverUrl: 1,
          duration: 1,
          likes: 1,
          comments: 1,
          plays: 1,
          createdAt: 1,
          genre: 1,
          description: 1,
          trendScore: 1,
          ageInDays: 1,
          artist: {
            _id: '$artistInfo._id',
            name: '$artistInfo.name',
            username: '$artistInfo.username',
            avatar: '$artistInfo.avatar'
          }
        }
      }
    ]);

    // Log des tendances pour debug
    console.log('🔥 Tendances calculées:', tracks.slice(0, 3).map(t => ({
      title: t.title,
      trendScore: t.trendScore,
      plays: t.plays,
      likes: t.likes?.length || 0,
      ageInDays: Math.round(t.ageInDays)
    })));

    return NextResponse.json({ 
      tracks,
      algorithm: 'trending_v2',
      factors: {
        plays: 'poids 1',
        likes: 'poids 3',
        recency: 'bonus 50-100%',
        quality: 'bonus 25-50'
      }
    });
  } catch (error) {
    console.error('Erreur récupération pistes en tendance:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des pistes en tendance' },
      { status: 500 }
    );
  }
} 