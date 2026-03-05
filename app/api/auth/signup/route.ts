import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { sendEmail, welcomeEmailTemplate } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { name, username, email, password, referralCode } = await request.json();

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
      await supabaseAdmin.auth.admin.deleteUser(user.id);
      return NextResponse.json(
        { error: profileError?.message || 'Erreur lors de la création du profil' },
        { status: 500 }
      );
    }

    console.log('✅ Nouvel utilisateur créé:', profile.username);

    // Process referral if provided
    let referrerName: string | null = null;
    if (referralCode) {
      try {
        const refRes = await fetch(
          `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/referral`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ referralCode, newUserId: user.id }),
          }
        );
        if (refRes.ok) {
          const refData = await refRes.json();
          referrerName = refData.referrerUsername || null;
          console.log('✅ Parrainage appliqué:', referralCode);
        }
      } catch (refErr) {
        console.warn('⚠️ Erreur parrainage (non bloquant):', refErr);
      }
    }

    // Send welcome email (non-blocking)
    sendEmail({
      to: email.trim().toLowerCase(),
      subject: 'Bienvenue sur Synaura ! 🎵',
      html: welcomeEmailTemplate({
        name: name.trim(),
        username: username.trim().toLowerCase(),
        referrerName,
      }),
    }).catch((err: any) => console.warn('⚠️ Erreur envoi email bienvenue:', err));

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
