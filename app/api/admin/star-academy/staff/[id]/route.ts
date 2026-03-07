import { NextRequest, NextResponse } from 'next/server';
import { getAdminGuard } from '@/lib/admin';
import { supabaseAdmin } from '@/lib/supabase';
import { sendEmail } from '@/lib/email';

const ROLE_LABELS: Record<string, string> = {
  coach_vocal: 'Coach Vocal',
  coach_scenique: 'Coach Scenique',
  direction_musicale: 'Direction Musicale',
  jury: 'Jury',
  production: 'Production / Staff',
  autre: 'Autre',
};

function staffStatusEmail(status: string, name: string, role: string) {
  const roleLabel = ROLE_LABELS[role] || role;
  const colors = status === 'accepted'
    ? { bg: '#059669', label: 'Felicitations !' }
    : { bg: '#dc2626', label: 'Resultat de ta candidature' };

  const message = status === 'accepted'
    ? `Ton profil de <strong>${roleLabel}</strong> a ete retenu pour integrer le staff de Star Academy TikTok. Tu recevras prochainement les details pour les prochaines etapes.`
    : `Apres examen attentif de ton profil, nous ne pouvons malheureusement pas retenir ta candidature de <strong>${roleLabel}</strong> pour cette edition. Nous te souhaitons le meilleur pour la suite.`;

  return `
<!DOCTYPE html><html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#07000f;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#07000f;padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#110820;border:1px solid rgba(147,51,234,0.2);border-radius:16px;overflow:hidden;">
<tr><td style="background:${colors.bg};padding:24px 30px;">
<h1 style="margin:0;color:white;font-size:20px;">${colors.label}</h1>
</td></tr>
<tr><td style="padding:30px;">
<p style="color:#e2e8f0;font-size:15px;margin:0 0 16px;">Bonjour <strong>${name}</strong>,</p>
<p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0 0 20px;">${message}</p>
<p style="color:#64748b;font-size:12px;margin:0;">— L'equipe Star Academy TikTok × Synaura</p>
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await getAdminGuard();
  if (!guard.ok) return NextResponse.json({ error: 'Non autorise.' }, { status: 403 });

  const { id } = params;
  const body = await req.json() as { status?: string; admin_notes?: string };
  const { status, admin_notes } = body;

  const VALID = ['pending', 'reviewing', 'accepted', 'rejected'];
  if (status && !VALID.includes(status)) {
    return NextResponse.json({ error: 'Statut invalide.' }, { status: 400 });
  }

  const { data: current, error: fetchError } = await supabaseAdmin
    .from('star_academy_staff_applications')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !current) {
    return NextResponse.json({ error: 'Candidature introuvable.' }, { status: 404 });
  }

  const updatePayload: Record<string, unknown> = {};
  if (status) updatePayload.status = status;
  if (admin_notes !== undefined) updatePayload.admin_notes = admin_notes;

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('star_academy_staff_applications')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    console.error('[admin/star-academy/staff/[id]]', updateError);
    return NextResponse.json({ error: 'Erreur mise a jour.' }, { status: 500 });
  }

  if (status && status !== current.status && (status === 'accepted' || status === 'rejected')) {
    try {
      await sendEmail({
        to: current.email,
        subject: status === 'accepted'
          ? 'Staff Star Academy TikTok — Tu es retenu(e) !'
          : 'Resultat candidature Staff — Star Academy TikTok',
        html: staffStatusEmail(status, current.full_name, current.role),
      });
      await supabaseAdmin
        .from('star_academy_staff_applications')
        .update({ notification_sent_at: new Date().toISOString() })
        .eq('id', id);
    } catch (emailErr) {
      console.warn('[admin/star-academy/staff/[id]] Email error:', emailErr);
    }
  }

  return NextResponse.json({ application: updated });
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await getAdminGuard();
  if (!guard.ok) return NextResponse.json({ error: 'Non autorise.' }, { status: 403 });

  const { data, error } = await supabaseAdmin
    .from('star_academy_staff_applications')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !data) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 });
  return NextResponse.json({ application: data });
}
