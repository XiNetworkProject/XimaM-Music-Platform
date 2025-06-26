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

    // Récupérer les pistes en tendance (basées sur les écoutes)
    const tracks = await Track.aggregate([
      {
        $sort: { plays: -1 }
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
    console.error('Erreur récupération pistes en tendance:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des pistes en tendance' },
      { status: 500 }
    );
  }
} 