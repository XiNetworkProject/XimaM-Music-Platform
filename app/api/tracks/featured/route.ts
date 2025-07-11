import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Track from '@/models/Track';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '5');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;

    // Algorithme spécial pour les pistes en vedette (carrousel)
    const tracks = await Track.aggregate([
      {
        $addFields: {
          // Score spécial pour le carrousel
          featuredScore: {
            $add: [
              // Base: écoutes
              { $multiply: ['$plays', 1] },
              // Engagement: likes (poids élevé)
              { $multiply: [{ $size: '$likes' }, 4] },
              // Engagement: commentaires
              { $multiply: [{ $size: '$comments' }, 2] },
              // Bonus majeur pour les pistes avec cover (essentiel pour le carrousel)
              {
                $cond: {
                  if: { $ne: ['$coverUrl', null] },
                  then: 500,
                  else: 0
                }
              },
              // Bonus pour les pistes avec description
              {
                $cond: {
                  if: { $ne: ['$description', null] },
                  then: 100,
                  else: 0
                }
              },
              // Bonus pour les pistes récentes (dernière semaine)
              {
                $cond: {
                  if: {
                    $gte: [
                      '$createdAt',
                      { $subtract: [new Date(), { $multiply: [7, 24, 60, 60, 1000] }] }
                    ]
                  },
                  then: { $multiply: ['$plays', 0.8] },
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
                  then: { $multiply: ['$plays', 1.2] },
                  else: 0
                }
              },
              // Bonus pour les pistes avec plusieurs genres (diversité)
              {
                $cond: {
                  if: { $gte: [{ $size: '$genre' }, 2] },
                  then: 150,
                  else: 0
                }
              },
              // Bonus pour les pistes avec une durée optimale (2-8 minutes)
              {
                $cond: {
                  if: {
                    $and: [
                      { $gte: ['$duration', 120] },
                      { $lte: ['$duration', 480] }
                    ]
                  },
                  then: 200,
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
          // Score d'engagement total
          totalEngagement: {
            $add: [
              { $size: '$likes' },
              { $size: '$comments' }
            ]
          }
        }
      },
      {
        $sort: { featuredScore: -1 }
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
          featuredScore: 1,
          totalEngagement: 1,
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

    // Log des pistes en vedette pour debug
    console.log('⭐ Pistes en vedette calculées:', tracks.slice(0, 3).map(t => ({
      title: t.title,
      featuredScore: t.featuredScore,
      plays: t.plays,
      likes: t.likes?.length || 0,
      comments: t.comments?.length || 0,
      totalEngagement: t.totalEngagement,
      hasCover: !!t.coverUrl,
      hasDescription: !!t.description,
      ageInDays: Math.round(t.ageInDays)
    })));

    return NextResponse.json({ 
      tracks,
      algorithm: 'featured_v1',
      factors: {
        plays: 'poids 1',
        likes: 'poids 4',
        comments: 'poids 2',
        cover: 'bonus 500',
        description: 'bonus 100',
        recency: 'bonus 80-120%',
        diversity: 'bonus 150',
        duration: 'bonus 200'
      }
    });
  } catch (error) {
    console.error('Erreur récupération pistes en vedette:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des pistes en vedette' },
      { status: 500 }
    );
  }
} 