import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendEmail } from '@/lib/email';

const ALLOWED_ROLES = ['coach_vocal', 'coach_scenique', 'direction_musicale', 'jury', 'production', 'autre'];

const ROLE_LABELS: Record<string, string> = {
  coach_vocal: 'Coach Vocal',
  coach_scenique: 'Coach Scenique',
  direction_musicale: 'Direction Musicale',
  jury: 'Jury',
  production: 'Production / Staff',
  autre: 'Autre',
};

function staffConfirmationTemplate({ name, role, trackingToken }: { name: string; role: string; trackingToken: string }) {
  const roleLabel = ROLE_LABELS[role] || role;
  return `
<!DOCTYPE html><html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#07000f;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#07000f;padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#110820;border:1px solid rgba(147,51,234,0.2);border-radius:16px;overflow:hidden;">
<tr><td style="background:linear-gradient(90deg,#7c3aed,#db2777);padding:24px 30px;">
<h1 style="margin:0;color:white;font-size:20px;">Star Academy TikTok — Staff</h1>
</td></tr>
<tr><td style="padding:30px;">
<p style="color:#e2e8f0;font-size:15px;margin:0 0 16px;">Bonjour <strong>${name}</strong>,</p>
<p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0 0 16px;">
Nous avons bien recu ta candidature pour rejoindre le <strong>staff</strong> de Star Academy TikTok en tant que <strong>${roleLabel}</strong>.
</p>
<p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0 0 20px;">
Notre equipe va examiner ton profil. Tu seras notifie(e) par email de la suite donnee a ta candidature.
</p>
<div style="background:rgba(147,51,234,0.1);border:1px solid rgba(147,51,234,0.2);border-radius:12px;padding:16px;margin-bottom:20px;">
<p style="color:#c4b5fd;font-size:12px;margin:0 0 6px;">Ton numero de suivi :</p>
<p style="color:white;font-size:16px;font-weight:bold;margin:0;letter-spacing:1px;">${trackingToken}</p>
</div>
<p style="color:#64748b;font-size:12px;margin:0;">Conserve cet email. A bientot sur Synaura !</p>
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const fullName     = (body.fullName     as string | undefined)?.trim() ?? '';
    const age          = parseInt(body.age ?? '0', 10);
    const email        = (body.email        as string | undefined)?.trim().toLowerCase() ?? '';
    const phone        = (body.phone        as string | undefined)?.trim() || null;
    const location     = (body.location     as string | undefined)?.trim() ?? '';
    const role         = (body.role         as string | undefined)?.trim() ?? '';
    const experience   = (body.experience   as string | undefined)?.trim() ?? '';
    const speciality   = (body.speciality   as string | undefined)?.trim() || null;
    const tiktokHandle = (body.tiktok       as string | undefined)?.trim() || null;
    const portfolioUrl = (body.portfolioUrl as string | undefined)?.trim() || null;
    const motivation   = (body.motivation   as string | undefined)?.trim() ?? '';
    const availability = (body.availability as string | undefined)?.trim() ?? '';
    const synauraUsername = (body.synauraUsername as string | undefined)?.trim() || null;

    if (!fullName || !email || !location || !role || !experience || !motivation || !availability) {
      return NextResponse.json({ error: 'Champs requis manquants.' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Email invalide.' }, { status: 400 });
    }
    if (isNaN(age) || age < 18 || age > 99) {
      return NextResponse.json({ error: 'Age invalide (18+ requis pour le staff).' }, { status: 400 });
    }
    if (!ALLOWED_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Role invalide.' }, { status: 400 });
    }

    const { data: configRows } = await supabaseAdmin
      .from('star_academy_config')
      .select('key, value');
    const config = Object.fromEntries((configRows ?? []).map((r) => [r.key, r.value]));
    if (config.is_open !== 'true') {
      return NextResponse.json({ error: 'Les inscriptions sont fermees.' }, { status: 403 });
    }

    const { data: existing } = await supabaseAdmin
      .from('star_academy_staff_applications')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'Une candidature staff existe deja pour cet email.' }, { status: 409 });
    }

    let userId: string | null = null;
    if (synauraUsername) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('username', synauraUsername)
        .maybeSingle();
      if (profile) userId = profile.id;
    }

    const { data: application, error: insertError } = await supabaseAdmin
      .from('star_academy_staff_applications')
      .insert({
        full_name: fullName,
        age,
        email,
        phone,
        location,
        role,
        experience,
        speciality,
        tiktok_handle: tiktokHandle,
        portfolio_url: portfolioUrl,
        motivation,
        availability,
        synaura_username: synauraUsername,
        user_id: userId,
        status: 'pending',
      })
      .select('tracking_token')
      .single();

    if (insertError) {
      console.error('[star-academy/apply-staff] Insert error:', insertError);
      return NextResponse.json({ error: 'Erreur lors de l\'enregistrement.' }, { status: 500 });
    }

    const trackingToken = application.tracking_token;

    try {
      await sendEmail({
        to: email,
        subject: 'Candidature Staff — Star Academy TikTok recue !',
        html: staffConfirmationTemplate({ name: fullName, role, trackingToken }),
      });
    } catch (emailErr) {
      console.warn('[star-academy/apply-staff] Email error:', emailErr);
    }

    return NextResponse.json({ ok: true, trackingToken, message: 'Candidature staff enregistree !' });
  } catch (err) {
    console.error('[star-academy/apply-staff] Unexpected error:', err);
    return NextResponse.json({ error: 'Erreur inattendue.' }, { status: 500 });
  }
}
