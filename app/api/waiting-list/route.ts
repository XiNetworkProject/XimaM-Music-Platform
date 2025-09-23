import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Email invalide' }, { status: 400 });
    }

    // Vérifier si l'email existe déjà
    const { data: existing } = await supabaseAdmin
      .from('waiting_list')
      .select('email')
      .eq('email', email)
      .single();

    if (existing) {
      return NextResponse.json({ message: 'Email déjà inscrit' }, { status: 200 });
    }

    // Ajouter à la liste d'attente
    const { error } = await supabaseAdmin
      .from('waiting_list')
      .insert({
        email,
        created_at: new Date().toISOString(),
        status: 'waiting'
      });

    if (error) {
      console.error('Erreur inscription liste d\'attente:', error);
      return NextResponse.json({ error: 'Erreur lors de l\'inscription' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Inscrit avec succès' }, { status: 200 });
  } catch (error) {
    console.error('Erreur API waiting-list:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Compter le nombre de personnes sur la liste d'attente
    const { count } = await supabaseAdmin
      .from('waiting_list')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({ 
      waitingCount: count || 0,
      message: `${count || 0} personnes sur la liste d'attente`
    });
  } catch (error) {
    console.error('Erreur récupération liste d\'attente:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
