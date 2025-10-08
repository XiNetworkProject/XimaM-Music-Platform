import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { name, username, email, password } = await request.json();

    // Validation des données
    if (!name || !username || !email || !password) {
      return NextResponse.json(
        { error: 'Tous les champs sont requis' },
        { status: 400 }
      );
    }

    if (name.trim().length < 2) {
      return NextResponse.json(
        { error: 'Le nom doit contenir au moins 2 caractères' },
        { status: 400 }
      );
    }

    if (username.trim().length < 3) {
      return NextResponse.json(
        { error: 'Le nom d\'utilisateur doit contenir au moins 3 caractères' },
        { status: 400 }
      );
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
      return NextResponse.json(
        { error: 'Le nom d\'utilisateur ne peut contenir que des lettres, chiffres et underscores' },
        { status: 400 }
      );
    }

    if (!/\S+@\S+\.\S+/.test(email.trim())) {
      return NextResponse.json(
        { error: 'Format d\'email invalide' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Le mot de passe doit contenir au moins 6 caractères' },
        { status: 400 }
      );
    }

    // Vérifier si l'email existe déjà
    const { data: existingEmail, error: emailError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email.trim().toLowerCase())
      .single();

    if (existingEmail && !emailError) {
      return NextResponse.json(
        { error: 'Un compte avec cet email existe déjà' },
        { status: 409 }
      );
    }

    // Vérifier si le nom d'utilisateur existe déjà
    const { data: existingUsername, error: usernameError } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username.trim().toLowerCase())
      .single();

    if (existingUsername && !usernameError) {
      return NextResponse.json(
        { error: 'Ce nom d\'utilisateur est déjà pris' },
        { status: 409 }
      );
    }

    // Créer l'utilisateur dans Supabase Auth avec le client admin
    const { data: { user }, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password: password,
      email_confirm: true
    });

    if (authError || !user) {
      console.error('❌ Erreur lors de la création de l\'utilisateur Supabase:', authError);
      return NextResponse.json(
        { error: authError?.message || 'Erreur lors de la création du compte' },
        { status: 500 }
      );
    }

    // Créer le profil dans la table profiles avec le client admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: user.id,
        name: name.trim(),
        username: username.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        is_verified: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (profileError) {
      console.error('❌ Erreur lors de la création du profil:', profileError);
      // Supprimer l'utilisateur créé si le profil échoue
      await supabaseAdmin.auth.admin.deleteUser(user.id);
      return NextResponse.json(
        { error: profileError?.message || 'Erreur lors de la création du profil' },
        { status: 500 }
      );
    }

    console.log('✅ Nouvel utilisateur créé:', profile.username);

    return NextResponse.json(
      { 
        message: 'Compte créé avec succès',
        user: {
          id: profile.id,
          name: profile.name,
          username: profile.username,
          email: profile.email
        }
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('❌ Erreur lors de l\'inscription:', error);
    
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
} 