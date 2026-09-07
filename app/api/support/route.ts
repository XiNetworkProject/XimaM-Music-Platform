import { NextRequest, NextResponse } from 'next/server';
import { dbAdmin } from '@/lib/database';
import { enforceRequestRateLimit, readLimitedJson, rejectUntrustedMutationOrigin } from '@/lib/security/requestSecurity';
import { validateSupportTicket } from '@/lib/security/publicForms';

const ALLOWED_SUBJECTS = [
  'Compte / Connexion',
  'Paiement',
  'Bug',
  'Contenu / Modération',
  'Autre',
];

export async function POST(req: NextRequest) {
  try {
    const originError = rejectUntrustedMutationOrigin(req);
    if (originError) return originError;
    const ipLimit = enforceRequestRateLimit(req, 'support-ip', 5, 15 * 60_000);
    if (ipLimit) return ipLimit;
    const parsed = await readLimitedJson<Record<string, unknown>>(req, 16 * 1024);
    if (!parsed.ok) return parsed.response;
    const validated = validateSupportTicket(parsed.value, ALLOWED_SUBJECTS);
    if (!validated.ok) return NextResponse.json({ error: validated.error }, { status: 400 });
    const { email, subject, message, url } = validated.value;
    const emailLimit = enforceRequestRateLimit(req, 'support-email', 3, 60 * 60_000, email);
    if (emailLimit) return emailLimit;

    const { error: dbError } = await dbAdmin.from('support_tickets').insert({
      email,
      subject,
      message,
      url,
      status: 'open',
    });

    if (dbError) {
      console.error('[support/route] insertion impossible');
      return NextResponse.json({ error: 'Erreur serveur. Réessaie plus tard.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    console.error('[support/route] erreur inattendue');
    return NextResponse.json({ error: 'Erreur serveur. Reessaie plus tard.' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
