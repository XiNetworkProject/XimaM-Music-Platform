import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, username } = await request.json();

    if (!email || !password || !name || !username) {
      return NextResponse.json({ error: 'Tous les champs sont requis' }, { status: 400 });
    }

    // Vérifier le nombre d'utilisateurs existants
    const { count: totalUsers } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    const userCount = totalUsers || 0;
    
    if (userCount >= 50) {
      return NextResponse.json({ 
        error: 'Inscription fermée - Limite de 50 utilisateurs atteinte',
        userCount,
        maxUsers: 50
      }, { status: 403 });
    }

    // Créer le compte Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase(),
      password,
      email_confirm: true, // Auto-confirmer l'email
      user_metadata: {
        name,
        username
      }
    });

    if (authError || !authData.user) {
      console.error('Erreur création utilisateur Supabase:', authError);
      return NextResponse.json({ error: 'Erreur lors de la création du compte' }, { status: 500 });
    }

    // Déterminer si l'utilisateur a l'accès anticipé (50 premiers)
    const hasEarlyAccess = userCount < 50;

    // Créer le profil utilisateur
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user.id,
        email: email.toLowerCase(),
        name,
        username,
        early_access: hasEarlyAccess,
        is_verified: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (profileError) {
      console.error('Erreur création profil:', profileError);
      // Nettoyer l'utilisateur créé en cas d'erreur
      try {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      } catch {}
      return NextResponse.json({ error: 'Erreur lors de la création du profil' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      user: profile,
      hasEarlyAccess,
      userCount: userCount + 1,
      message: hasEarlyAccess ? 'Compte créé avec accès complet' : 'Compte créé avec accès limité'
    });

  } catch (error) {
    console.error('Erreur inscription:', error);
    return NextResponse.json({ error: 'Erreur serveur lors de l\'inscription' }, { status: 500 });
  }
}
