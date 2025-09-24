import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { token, code, password, email } = await request.json();
    if (!password || password.length < 8) {
      return NextResponse.json({ error: 'Mot de passe trop court' }, { status: 400 });
    }

    // Charger le reset
    const { data: reset, error } = await supabaseAdmin
      .from('password_resets')
      .select('*')
      .eq('email', (email || '').toLowerCase())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (error || !reset) {
      return NextResponse.json({ error: 'Lien ou code invalide' }, { status: 400 });
    }

    // Valider token/code et expiration et non utilisé
    const now = new Date();
    if ((token && token !== reset.token) || (code && code !== reset.code)) {
      return NextResponse.json({ error: 'Lien ou code invalide' }, { status: 400 });
    }
    if (reset.used_at) {
      return NextResponse.json({ error: 'Lien déjà utilisé' }, { status: 400 });
    }
    if (new Date(reset.expires_at) < now) {
      return NextResponse.json({ error: 'Lien expiré' }, { status: 400 });
    }

    // Mettre à jour le mot de passe via Admin API
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const admin = createClient(supabaseUrl, supabaseServiceKey);

    // Récupérer user_id si nécessaire
    let userId = reset.user_id;
    if (!userId) {
      const { data: usersList } = await admin.auth.admin.listUsers();
      const user = usersList?.users?.find(u => u.email?.toLowerCase() === reset.email.toLowerCase());
      userId = user?.id;
    }
    if (!userId) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }

    const { error: updateErr } = await admin.auth.admin.updateUserById(userId, { password });
    if (updateErr) {
      return NextResponse.json({ error: 'Erreur mise à jour mot de passe' }, { status: 500 });
    }

    // Marquer le reset comme utilisé
    await supabaseAdmin
      .from('password_resets')
      .update({ used_at: new Date().toISOString() })
      .eq('id', reset.id);

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erreur' }, { status: 500 });
  }
}

