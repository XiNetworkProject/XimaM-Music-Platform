import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { sendEmail, resetEmailTemplate } from '@/lib/email';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    // Validation de l'email
    if (!email || !/\S+@\S+\.\S+/.test(email.trim())) {
      return NextResponse.json(
        { error: 'Format d\'email invalide' },
        { status: 400 }
      );
    }

    // Vérifier si l'utilisateur existe dans Supabase Auth (via service role)
    const emailLower = email.trim().toLowerCase();
    let userExists = true;
    let userId: string | null = null;
    try {
      const { data: adminList, error: adminErr } = await supabaseAdmin.auth.admin.listUsers();
      if (!adminErr && adminList?.users) {
        const found = adminList.users.find(u => (u.email || '').toLowerCase() === emailLower);
        userExists = !!found;
        userId = found?.id || null;
      }
    } catch (e) {
      // En cas d'erreur d'admin (not_admin), on n'échoue pas et on continue de façon silencieuse
      userExists = true;
      userId = null;
    }
    
    // Pour des raisons de sécurité, on ne révèle pas si l'email existe ou non
    // On renvoie toujours un succès même si l'utilisateur n'existe pas
    
    if (userExists) {
      console.log('📧 Demande de récupération de mot de passe pour:', email);
      // Générer token + code
      const token = crypto.randomBytes(24).toString('hex');
      const code = (Math.floor(100000 + Math.random() * 900000)).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      // Enregistrer en base
      await supabaseAdmin.from('password_resets').insert({
        user_id: userId,
        email: emailLower,
        token,
        code,
        expires_at: expiresAt,
        ip: request.headers.get('x-forwarded-for') || request.ip || null,
        user_agent: request.headers.get('user-agent') || null,
      });

      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const link = `${baseUrl}/auth/reset-password?token=${token}`;

      // Envoyer email
      await sendEmail({
        to: email,
        subject: 'Réinitialisez votre mot de passe - Synaura',
        html: resetEmailTemplate({ code, link })
      });

      console.log('✅ Email de récupération envoyé pour:', email);
    } else {
      console.log('📧 Demande de récupération pour un email inexistant:', email);
    }

    // Toujours renvoyer un succès pour des raisons de sécurité
    return NextResponse.json(
      { 
        message: 'Si un compte existe avec cet email, vous recevrez un lien de réinitialisation'
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('❌ Erreur lors de la récupération de mot de passe:', error);
    
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
} 