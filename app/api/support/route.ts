import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const ALLOWED_SUBJECTS = [
  'Compte / Connexion',
  'Paiement',
  'Bug',
  'Contenu / Modération',
  'Autre',
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, subject, message, url } = body as Record<string, string>;

    if (!email || !subject || !message) {
      return NextResponse.json({ error: 'Champs requis manquants.' }, { status: 400 });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Adresse email invalide.' }, { status: 400 });
    }

    if (!ALLOWED_SUBJECTS.includes(subject)) {
      return NextResponse.json({ error: 'Sujet invalide.' }, { status: 400 });
    }

    if (message.trim().length < 10) {
      return NextResponse.json({ error: 'Message trop court (min 10 caractères).' }, { status: 400 });
    }

    const { error: dbError } = await supabaseAdmin.from('support_tickets').insert({
      email: email.trim().toLowerCase(),
      subject,
      message: message.trim(),
      url: url?.trim() || null,
      status: 'open',
    });

    if (dbError) {
      console.error('[support/route] Supabase error:', dbError);
      return NextResponse.json({ error: 'Erreur serveur. Réessaie plus tard.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[support/route] Unexpected error:', err);
    return NextResponse.json({ error: 'Erreur inattendue.' }, { status: 500 });
  }
}
