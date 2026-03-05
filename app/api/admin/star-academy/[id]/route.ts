import { NextRequest, NextResponse } from 'next/server';
import { getAdminGuard } from '@/lib/admin';
import { supabaseAdmin } from '@/lib/supabase';
import {
  sendEmail,
  saAcceptedTemplate,
  saRejectedTemplate,
  saReviewingTemplate,
} from '@/lib/email';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await getAdminGuard();
  if (!guard.ok) return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 });

  const { id } = params;
  const body = await req.json() as { status?: string; admin_notes?: string };
  const { status, admin_notes } = body;

  const VALID_STATUSES = ['pending', 'reviewing', 'accepted', 'rejected'];
  if (status && !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Statut invalide.' }, { status: 400 });
  }

  // Récupérer l'application courante
  const { data: current, error: fetchError } = await supabaseAdmin
    .from('star_academy_applications')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !current) {
    return NextResponse.json({ error: 'Candidature introuvable.' }, { status: 404 });
  }

  // Préparer la mise à jour
  const updatePayload: Record<string, unknown> = {};
  if (status) updatePayload.status = status;
  if (admin_notes !== undefined) updatePayload.admin_notes = admin_notes;

  // ── Activer le premium si accepté + compte Synaura lié ──
  if (status === 'accepted' && current.user_id) {
    const premiumUntil = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
    await supabaseAdmin
      .from('profiles')
      .update({
        plan: 'pro',
        subscription_status: 'active',
        subscription_current_period_end: premiumUntil,
        updated_at: new Date().toISOString(),
      })
      .eq('id', current.user_id);
  }

  // Mettre à jour en base
  const { data: updated, error: updateError } = await supabaseAdmin
    .from('star_academy_applications')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    console.error('[admin/star-academy/[id]]', updateError);
    return NextResponse.json({ error: 'Erreur lors de la mise à jour.' }, { status: 500 });
  }

  // ── Envoyer notification email si statut change ──────────
  if (status && status !== current.status) {
    try {
      let emailHtml: string | null = null;
      let emailSubject = '';

      if (status === 'accepted') {
        emailSubject = '🌟 Tu es retenu(e) pour Star Academy TikTok × Synaura !';
        emailHtml = saAcceptedTemplate({
          name:             current.full_name,
          trackingToken:    current.tracking_token,
          tiktokHandle:     current.tiktok_handle,
          synauraUsername:  current.synaura_username,
        });
      } else if (status === 'rejected') {
        emailSubject = 'Résultat de ta candidature Star Academy TikTok';
        emailHtml = saRejectedTemplate({
          name:          current.full_name,
          trackingToken: current.tracking_token,
        });
      } else if (status === 'reviewing') {
        emailSubject = '🎧 Ta candidature Star Academy est en cours d\'écoute';
        emailHtml = saReviewingTemplate({
          name:          current.full_name,
          trackingToken: current.tracking_token,
        });
      }

      if (emailHtml) {
        await sendEmail({ to: current.email, subject: emailSubject, html: emailHtml });
        await supabaseAdmin
          .from('star_academy_applications')
          .update({ notification_sent_at: new Date().toISOString() })
          .eq('id', id);
      }
    } catch (emailErr) {
      console.warn('[admin/star-academy/[id]] Email error:', emailErr);
    }
  }

  return NextResponse.json({ application: updated });
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await getAdminGuard();
  if (!guard.ok) return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 });

  const { data, error } = await supabaseAdmin
    .from('star_academy_applications')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !data) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 });
  return NextResponse.json({ application: data });
}
