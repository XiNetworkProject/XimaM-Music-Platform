import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    console.log('🎵 Callback Suno API reçu:', data);
    
    // Traiter le callback de Suno API
    // Ici on peut stocker le résultat ou notifier l'utilisateur
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Erreur callback Suno API:', error);
    return NextResponse.json({ error: 'Erreur callback' }, { status: 500 });
  }
}
