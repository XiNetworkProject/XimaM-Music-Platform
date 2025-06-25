import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const { email } = await request.json();

    // Validation de l'email
    if (!email || !/\S+@\S+\.\S+/.test(email.trim())) {
      return NextResponse.json(
        { error: 'Format d\'email invalide' },
        { status: 400 }
      );
    }

    // Vérifier si l'utilisateur existe
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    
    // Pour des raisons de sécurité, on ne révèle pas si l'email existe ou non
    // On renvoie toujours un succès même si l'utilisateur n'existe pas
    
    if (user) {
      console.log('📧 Demande de récupération de mot de passe pour:', email);
      
      // TODO: Implémenter l'envoi d'email avec un service comme SendGrid, Resend, etc.
      // Pour l'instant, on simule juste l'envoi
      
      // Exemple de ce qui pourrait être fait :
      // 1. Générer un token de réinitialisation
      // 2. Sauvegarder le token en base avec une expiration
      // 3. Envoyer un email avec le lien de réinitialisation
      
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