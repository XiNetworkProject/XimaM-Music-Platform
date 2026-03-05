import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendEmail, saConfirmationTemplate } from '@/lib/email';

const ALLOWED_CATEGORIES = ['Chant', 'Rap', 'Mix / DJ', 'Performance / Danse', 'Autre'];

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    // ── Extraire les champs texte ──────────────────────────
    const fullName     = (formData.get('fullName')    as string | null)?.trim() ?? '';
    const age          = parseInt(formData.get('age') as string ?? '0', 10);
    const email        = (formData.get('email')       as string | null)?.trim().toLowerCase() ?? '';
    const phone        = (formData.get('phone')       as string | null)?.trim() || null;
    const location     = (formData.get('location')    as string | null)?.trim() ?? '';
    const tiktokHandle = (formData.get('tiktok')      as string | null)?.trim() ?? '';
    const category     = (formData.get('category')    as string | null)?.trim() ?? '';
    const level        = (formData.get('level')       as string | null)?.trim() || null;
    const link         = (formData.get('link')        as string | null)?.trim() || null;
    const bio          = (formData.get('bio')         as string | null)?.trim() ?? '';
    const availability = (formData.get('availability')as string | null)?.trim() || null;
    const synauraUsername = (formData.get('synauraUsername') as string | null)?.trim() || null;
    const synauraPassword = (formData.get('synauraPassword') as string | null) || null;
    const audioFile    = formData.get('audio') as File | null;

    // ── Validation ─────────────────────────────────────────
    if (!fullName || !email || !location || !tiktokHandle || !bio || !category) {
      return NextResponse.json({ error: 'Champs requis manquants.' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Email invalide.' }, { status: 400 });
    }
    if (isNaN(age) || age < 13 || age > 99) {
      return NextResponse.json({ error: 'Âge invalide (13–99).' }, { status: 400 });
    }
    if (!ALLOWED_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: 'Catégorie invalide.' }, { status: 400 });
    }
    if (!audioFile || !audioFile.type.startsWith('audio/')) {
      return NextResponse.json({ error: 'Un fichier audio est requis.' }, { status: 400 });
    }
    if (audioFile.size > 30 * 1024 * 1024) {
      return NextResponse.json({ error: 'Fichier audio trop volumineux (max 30MB).' }, { status: 400 });
    }

    // ── Vérifier si le concours est ouvert ─────────────────
    const { data: configRows } = await supabaseAdmin
      .from('star_academy_config')
      .select('key, value');

    const config = Object.fromEntries((configRows ?? []).map((r) => [r.key, r.value]));
    if (config.is_open !== 'true') {
      return NextResponse.json({ error: 'Les inscriptions sont fermées.' }, { status: 403 });
    }
    if (config.deadline) {
      const deadline = new Date(config.deadline);
      if (new Date() > deadline) {
        return NextResponse.json({ error: 'La date limite d\'inscription est dépassée.' }, { status: 403 });
      }
    }

    // ── Vérifier limite de candidats ───────────────────────
    const maxCandidates = parseInt(config.max_candidates ?? '200', 10);
    const { count } = await supabaseAdmin
      .from('star_academy_applications')
      .select('id', { count: 'exact', head: true });

    if ((count ?? 0) >= maxCandidates) {
      return NextResponse.json({ error: 'Le nombre maximum de candidats est atteint.' }, { status: 403 });
    }

    // ── Vérifier doublon email ─────────────────────────────
    const { data: existing } = await supabaseAdmin
      .from('star_academy_applications')
      .select('id')
      .eq('email', email)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Une candidature existe déjà pour cet email.' }, { status: 409 });
    }

    // ── Upload audio → Supabase Storage ───────────────────
    const applicationId = crypto.randomUUID();
    const safeFilename  = audioFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath   = `${applicationId}/${safeFilename}`;
    const audioBuffer   = Buffer.from(await audioFile.arrayBuffer());

    const { error: storageError } = await supabaseAdmin.storage
      .from('star-academy-audio')
      .upload(storagePath, audioBuffer, {
        contentType: audioFile.type,
        upsert: false,
      });

    let audioUrl: string | null = null;
    if (!storageError) {
      const { data: urlData } = supabaseAdmin.storage
        .from('star-academy-audio')
        .getPublicUrl(storagePath);
      audioUrl = urlData?.publicUrl ?? null;
    } else {
      console.warn('[star-academy/apply] Storage upload failed:', storageError.message);
    }

    // ── Créer compte Synaura (optionnel) ───────────────────
    let userId: string | null = null;

    if (synauraUsername && synauraPassword) {
      // Chercher si l'email existe déjà en tant qu'utilisateur Synaura
      const { data: { users: existingUsers } } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = existingUsers?.find((u) => u.email === email);

      if (existingUser) {
        userId = existingUser.id;
      } else {
        const { data: newUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: synauraPassword,
          email_confirm: true,
          user_metadata: { username: synauraUsername, full_name: fullName },
        });

        if (!authError && newUser.user) {
          userId = newUser.user.id;
          // Créer le profil
          await supabaseAdmin.from('profiles').upsert({
            id: userId,
            username: synauraUsername,
            display_name: fullName,
            email,
            plan: 'free',
            created_at: new Date().toISOString(),
          }, { onConflict: 'id' });
        } else {
          console.warn('[star-academy/apply] Auth user creation failed:', authError?.message);
        }
      }
    }

    // ── Insérer la candidature ─────────────────────────────
    const { data: application, error: insertError } = await supabaseAdmin
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
        audio_filename:   audioFile.name,
        synaura_username: synauraUsername,
        user_id:          userId,
        status:           'pending',
      })
      .select('tracking_token')
      .single();

    if (insertError) {
      console.error('[star-academy/apply] Insert error:', insertError);
      return NextResponse.json({ error: 'Erreur lors de l\'enregistrement. Réessaie.' }, { status: 500 });
    }

    const trackingToken = application.tracking_token;

    // ── Envoyer email de confirmation ──────────────────────
    try {
      await sendEmail({
        to: email,
        subject: '🌟 Candidature Star Academy TikTok × Synaura reçue !',
        html: saConfirmationTemplate({ name: fullName, trackingToken, tiktokHandle }),
      });
      await supabaseAdmin
        .from('star_academy_applications')
        .update({ notification_sent_at: new Date().toISOString() })
        .eq('id', applicationId);
    } catch (emailErr) {
      console.warn('[star-academy/apply] Email send failed:', emailErr);
    }

    return NextResponse.json({
      ok: true,
      trackingToken,
      message: 'Candidature enregistrée avec succès !',
      accountCreated: !!userId && !!synauraPassword,
    });
  } catch (err) {
    console.error('[star-academy/apply] Unexpected error:', err);
    return NextResponse.json({ error: 'Erreur inattendue. Réessaie.' }, { status: 500 });
  }
}
