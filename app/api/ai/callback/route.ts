import { NextRequest, NextResponse } from 'next/server';
import { diagnosticsEnabled } from '@/lib/diagnostics';

export async function POST(request: NextRequest) {
  if (!diagnosticsEnabled()) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  try {
    await request.json();
    
    // Traiter le callback de Suno API
    // Ici on peut stocker le résultat ou notifier l'utilisateur
    
    return NextResponse.json({ success: true });
  } catch {
    console.error('[ai/callback] payload invalide');
    return NextResponse.json({ error: 'Erreur callback' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
