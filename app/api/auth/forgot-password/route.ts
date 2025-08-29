import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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

    // Vérifier si l'utilisateur existe dans Supabase Auth
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Erreur lors de la vérification de l\'utilisateur:', authError);
      return NextResponse.json(
        { error: 'Erreur interne du serveur' },
        { status: 500 }
      );
    }
    
    const userExists = users.some(user => user.email === email.trim().toLowerCase());
    
    // Pour des raisons de sécurité, on ne révèle pas si l'email existe ou non
    // On renvoie toujours un succès même si l'utilisateur n'existe pas
    
    if (userExists) {
      console.log('📧 Demande de récupération de mot de passe pour:', email);
      
      // TODO: Implémenter l'envoi d'email avec un service comme SendGrid, Resend, etc.
      // Pour l'instant, on simule juste l'envoi
      
      // Exemple de ce qui pourrait être fait :
      // 1. Utiliser Supabase Auth pour envoyer un email de réinitialisation
      // 2. Ou implémenter un service d'email personnalisé
      
      console.log('✅ Email de récupération "envoyé" pour:', email);
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