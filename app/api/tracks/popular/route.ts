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

    // Algorithme de popularité amélioré
    const tracks = await Track.aggregate([
      {
        $addFields: {
          // Score de popularité basé sur plusieurs facteurs
          popularityScore: {
            $add: [
              // Base: écoutes (poids 1)
              { $multiply: ['$plays', 1] },
              // Engagement: likes (poids 2.5)
              { $multiply: [{ $size: '$likes' }, 2.5] },
              // Engagement: commentaires (poids 1.5)
              { $multiply: [{ $size: '$comments' }, 1.5] },
              // Bonus pour les pistes avec cover (qualité visuelle)
              {
                $cond: {
                  if: { $ne: ['$coverUrl', null] },
                  then: 100,
                  else: 0
                }
              },
              // Bonus pour les pistes avec description
              {
                $cond: {
                  if: { $ne: ['$description', null] },
                  then: 50,
                  else: 0
                }
              },
              // Bonus pour les pistes avec plusieurs genres (diversité)
              {
                $cond: {
                  if: { $gte: [{ $size: '$genre' }, 2] },
                  then: 75,
                  else: 0
                }
              },
              // Bonus pour les pistes récentes mais pas trop (équilibre)
              {
                $cond: {
                  if: {
                    $and: [
                      { $gte: ['$createdAt', { $subtract: [new Date(), { $multiply: [30, 24, 60, 60, 1000] }] }] },
                      { $lte: ['$createdAt', { $subtract: [new Date(), { $multiply: [1, 24, 60, 60, 1000] }] }] }
                    ]
                  },
                  then: { $multiply: ['$plays', 0.3] },
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
          },
          // Score d'engagement (likes + commentaires)
          engagementScore: {
            $add: [
              { $multiply: [{ $size: '$likes' }, 2] },
              { $multiply: [{ $size: '$comments' }, 1] }
            ]
          }
        }
      },
      {
        $sort: { popularityScore: -1 }
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
          popularityScore: 1,
          engagementScore: 1,
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

    // Log des pistes populaires pour debug
    console.log('⭐ Pistes populaires calculées:', tracks.slice(0, 3).map(t => ({
      title: t.title,
      popularityScore: t.popularityScore,
      plays: t.plays,
      likes: t.likes?.length || 0,
      comments: t.comments?.length || 0,
      engagementScore: t.engagementScore,
      ageInDays: Math.round(t.ageInDays)
    })));

    return NextResponse.json({ 
      tracks,
      algorithm: 'popular_v2',
      factors: {
        plays: 'poids 1',
        likes: 'poids 2.5',
        comments: 'poids 1.5',
        quality: 'bonus 50-100',
        diversity: 'bonus 75',
        recency: 'bonus 30%'
      }
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('Erreur récupération pistes populaires:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des pistes populaires' },
      { status: 500 }
    );
  }
} 