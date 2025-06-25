import { NextRequest, NextResponse } from 'next/server';
import dbConnect, { isConnected } from '@/lib/db';
import User from '@/models/User';

export async function GET(request: NextRequest) {
  try {
    // S'assurer que la connexion est établie
    await dbConnect();
    
    // Vérifier que la connexion est active
    if (!isConnected()) {
      console.warn('⚠️ MongoDB non connecté, tentative de reconnexion...');
      await dbConnect();
    }
    
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    
    let query = {};
    if (search) {
      query = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { username: { $regex: search, $options: 'i' } }
        ]
      };
    }
    
    const users = await User.find(query)
      .select('name username avatar bio followers following')
      .limit(limit)
      .sort({ followers: -1, createdAt: -1 });
    
    return NextResponse.json({ users });
  } catch (error) {
    console.error('Erreur API users:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des utilisateurs' },
      { status: 500 }
    );
  }
} 