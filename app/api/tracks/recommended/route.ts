import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import dbConnect from '@/lib/db';
import Track from '@/models/Track';
import User from '@/models/User';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;

    // Récupérer l'utilisateur avec ses likes
    const user = await User.findById(session.user.id).select('likedTracks');
    if (!user || !user.likedTracks || user.likedTracks.length === 0) {
      // Si l'utilisateur n'a pas de likes, retourner les pistes populaires
      const tracks = await Track.aggregate([
        {
          $addFields: {
            popularityScore: {
              $add: [
                { $multiply: [{ $size: '$likes' }, 2] },
                '$plays'
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
            artist: {
              _id: '$artistInfo._id',
              name: '$artistInfo.name',
              username: '$artistInfo.username',
              avatar: '$artistInfo.avatar'
            }
          }
        }
      ]);
      return NextResponse.json({ tracks });
    }

    // Récupérer les artistes des pistes likées par l'utilisateur
    const likedTracks = await Track.find({ _id: { $in: user.likedTracks } }).select('artist');
    const likedArtists = [...new Set(likedTracks.map(track => track.artist.toString()))];

    // Récupérer les pistes recommandées basées sur les artistes likés
    const tracks = await Track.aggregate([
      {
        $match: {
          artist: { $in: likedArtists },
          _id: { $nin: user.likedTracks } // Exclure les pistes déjà likées
        }
      },
      {
        $addFields: {
          popularityScore: {
            $add: [
              { $multiply: [{ $size: '$likes' }, 2] },
              '$plays'
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
          artist: {
            _id: '$artistInfo._id',
            name: '$artistInfo.name',
            username: '$artistInfo.username',
            avatar: '$artistInfo.avatar'
          }
        }
      }
    ]);

    return NextResponse.json({ tracks });
  } catch (error) {
    console.error('Erreur récupération pistes recommandées:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des pistes recommandées' },
      { status: 500 }
    );
  }
} 