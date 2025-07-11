import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

interface UserData {
  _id: any;
  name: string;
  username: string;
  avatar?: string;
  lastSeen: Date;
}

// GET /api/users/online-status
export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userIds = searchParams.get('userIds');
    
    if (!userIds) {
      return NextResponse.json({ error: 'userIds requis' }, { status: 400 });
    }

    const userIdArray = userIds.split(',');
    
    // Récupérer les utilisateurs avec leur lastSeen
    const users = await User.find({
      _id: { $in: userIdArray }
    })
    .select('_id name username avatar lastSeen')
    .lean() as any[];

    // Calculer le statut en ligne pour chaque utilisateur
    const now = new Date();
    const onlineStatuses = users.map(user => {
      const timeDiff = now.getTime() - new Date(user.lastSeen).getTime();
      const minutesDiff = timeDiff / (1000 * 60);
      
      // Considérer en ligne si vu il y a moins de 5 minutes
      const isOnline = minutesDiff < 5;
      
      return {
        userId: user._id.toString(),
        name: user.name,
        username: user.username,
        avatar: user.avatar,
        isOnline,
        lastSeen: user.lastSeen,
        minutesAgo: Math.floor(minutesDiff)
      };
    });

    return NextResponse.json({ 
      success: true, 
      onlineStatuses,
      timestamp: now.toISOString()
    });
    
  } catch (error) {
    console.error('Erreur récupération statuts en ligne:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des statuts en ligne' },
      { status: 500 }
    );
  }
} 