import { NextRequest, NextResponse } from 'next/server';
import { dbAdmin } from '@/lib/database';
import { sendEmail, saConfirmationTemplate } from '@/lib/email';
import { deleteLocalMedia, isLocalMediaReference } from '@/lib/localMediaStorage';
import { createLocalUser, findLocalAuthUserIdByEmail } from '@/lib/localAuth';
import { enforceRequestRateLimit, readLimitedJson, rejectUntrustedMutationOrigin } from '@/lib/security/requestSecurity';
import { cleanOptionalHttpUrl, cleanPublicText, escapeHtml } from '@/lib/security/publicForms';

const ALLOWED_CATEGORIES = ['Chant Solo', 'Rap / Spoken Word', 'Cover / Reprise', 'Mix avec Vocal', 'Duo / Groupe', 'Chant', 'Rap', 'Mix / DJ', 'Performance / Danse', 'Autre'];

export async function POST(req: NextRequest) {
  try {
    const originError = rejectUntrustedMutationOrigin(req);
    if (originError) return originError;
    const ipLimit = enforceRequestRateLimit(req, 'star-academy-apply-ip', 5, 24 * 60 * 60_000);
    if (ipLimit) return ipLimit;
    const parsed = await readLimitedJson<any>(req, 64 * 1024);
    if (!parsed.ok) return parsed.response;
    const body = parsed.value;

    const fullName     = cleanPublicText(body.fullName, 120);
    const age          = parseInt(body.age ?? '0', 10);
    const email        = cleanPublicText(body.email, 254).toLowerCase();
    const phone        = cleanPublicText(body.phone, 32) || null;
    const location     = cleanPublicText(body.location, 160);
    const tiktokHandle = cleanPublicText(body.tiktok, 80);
    const category     = cleanPublicText(body.category, 80);
    const level        = cleanPublicText(body.level, 80) || null;
    const link         = cleanOptionalHttpUrl(body.link);
    const bio          = cleanPublicText(body.bio, 5_000, true);
    const availability = cleanPublicText(body.availability, 1_000, true) || null;
    const synauraUsername = cleanPublicText(body.synauraUsername, 30) || null;
    const synauraPassword = (body.synauraPassword as string | undefined) || null;
    const audioUrl     = cleanPublicText(body.audioUrl, 2_048) || null;
    const audioPublicId = cleanPublicText(body.audioPublicId, 512) || null;
    const audioFilename = cleanPublicText(body.audioFilename, 255) || null;
    const cleanupAudio = async () => {
      if (audioPublicId) await deleteLocalMedia(audioPublicId).catch(() => false);
    };

    // ── Validation ─────────────────────────────────────────
    if (!fullName || !email || !location || !tiktokHandle || !bio || !category) {
      await cleanupAudio();
      return NextResponse.json({ error: 'Champs requis manquants.' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      await cleanupAudio();
      return NextResponse.json({ error: 'Email invalide.' }, { status: 400 });
    }
    if (body.link && link === undefined) {
      await cleanupAudio();
      return NextResponse.json({ error: 'Lien invalide.' }, { status: 400 });
    }
    if (synauraPassword && (synauraPassword.length < 8 || synauraPassword.length > 256)) {
      await cleanupAudio();
      return NextResponse.json({ error: 'Mot de passe invalide.' }, { status: 400 });
    }
    const emailLimit = enforceRequestRateLimit(req, 'star-academy-apply-email', 2, 24 * 60 * 60_000, email);
    if (emailLimit) {
      await cleanupAudio();
      return emailLimit;
    }
    if (isNaN(age) || age < 13 || age > 99) {
      await cleanupAudio();
      return NextResponse.json({ error: 'Âge invalide (13–99).' }, { status: 400 });
    }
    if (!ALLOWED_CATEGORIES.includes(category)) {
      await cleanupAudio();
      return NextResponse.json({ error: 'Catégorie invalide.' }, { status: 400 });
    }
    if (!audioUrl) {
      return NextResponse.json({ error: 'Un fichier audio est requis.' }, { status: 400 });
    }
    if (!isLocalMediaReference(audioUrl, audioPublicId, 'star-academy-audio')) {
      return NextResponse.json({ error: 'Reference audio locale invalide.' }, { status: 422 });
    }

    // ── Vérifier si le concours est ouvert ─────────────────
    const { data: configRows } = await dbAdmin
      .from('star_academy_config')
      .select('key, value');

    const config = Object.fromEntries((configRows ?? []).map((r) => [r.key, r.value]));
    if (config.is_open !== 'true') {
      await cleanupAudio();
      return NextResponse.json({ error: 'Les inscriptions sont fermées.' }, { status: 403 });
    }
    if (config.deadline) {
      const deadline = new Date(config.deadline);
      // Prolongation exceptionnelle de 15 jours
      deadline.setDate(deadline.getDate() + 15);
      if (new Date() > deadline) {
        await cleanupAudio();
        return NextResponse.json({ error: 'La date limite d\'inscription est dépassée.' }, { status: 403 });
      }
    }

    // ── Vérifier limite de candidats ───────────────────────
    const maxCandidates = parseInt(config.max_candidates ?? '200', 10);
    const { count } = await dbAdmin
      .from('star_academy_applications')
      .select('id', { count: 'exact', head: true });

    if ((count ?? 0) >= maxCandidates) {
      await cleanupAudio();
      return NextResponse.json({ error: 'Le nombre maximum de candidats est atteint.' }, { status: 403 });
    }

    // ── Vérifier doublon email ─────────────────────────────
    const { data: existing } = await dbAdmin
      .from('star_academy_applications')
      .select('id')
      .eq('email', email)
      .single();

    if (existing) {
      await cleanupAudio();
      return NextResponse.json({ error: 'Une candidature existe déjà pour cet email.' }, { status: 409 });
    }

    const applicationId = crypto.randomUUID();

    // ── Créer compte Synaura (optionnel) ───────────────────
    let userId: string | null = null;

    if (synauraUsername && synauraPassword) {
      const existingUserId = await findLocalAuthUserIdByEmail(email);
      if (existingUserId) {
        userId = existingUserId;
      } else {
        try {
          userId = (await createLocalUser({
            email,
            password: synauraPassword,
            username: synauraUsername,
            name: fullName,
          })).id;
        } catch {
          console.warn('[star-academy/apply] creation du compte local impossible');
        }
      }
    }

    // ── Insérer la candidature ─────────────────────────────
    const { data: application, error: insertError } = await dbAdmin
      .from('star_academy_applications')
      .insert({
        id:               applicationId,
        full_name:        fullName,
        age,
        email,
        phone,
        location,
        tiktok_handle:    tiktokHandle,
        category,
        level,
        link,
        bio,
        availability,
        audio_url:        audioUrl,
        audio_filename:   audioFilename,
        synaura_username: synauraUsername,
        user_id:          userId,
        status:           'pending',
      })
      .select('tracking_token')
      .single();

    if (insertError) {
      console.error('[star-academy/apply] insertion impossible');
      await cleanupAudio();
      return NextResponse.json({ error: 'Erreur lors de l\'enregistrement. Réessaie.' }, { status: 500 });
    }

    const trackingToken = application.tracking_token;

    // ── Envoyer email de confirmation ──────────────────────
    try {
      await sendEmail({
        to: email,
        subject: 'Candidature Star Academy TikTok reçue !',
        html: saConfirmationTemplate({
          name: escapeHtml(fullName),
          trackingToken: escapeHtml(trackingToken),
          tiktokHandle: escapeHtml(tiktokHandle),
        }),
      });
      await dbAdmin
        .from('star_academy_applications')
        .update({ notification_sent_at: new Date().toISOString() })
        .eq('id', applicationId);
    } catch {
      console.warn('[star-academy/apply] email de confirmation non envoye');
    }

    return NextResponse.json({
      ok: true,
      trackingToken,
      message: 'Candidature enregistrée avec succès !',
      accountCreated: !!userId && !!synauraPassword,
    });
  } catch {
    console.error('[star-academy/apply] erreur inattendue');
    return NextResponse.json({ error: 'Erreur inattendue. Réessaie.' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
