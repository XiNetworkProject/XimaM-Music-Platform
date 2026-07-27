import { NextRequest, NextResponse } from 'next/server';
import { getAdminGuard } from '@/lib/admin';
import { supabaseAdmin } from '@/lib/supabase';
import { sendEmail } from '@/lib/email';
import { buildCampaignEmail, CampaignTemplate, CAMPAIGN_PRESETS } from '@/lib/emailCampaigns';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function campaignUsers(userIds?: string[]) {
  let privateQuery = supabaseAdmin
    .from('account_private')
    .select('user_id, email')
    .not('email', 'is', null);
  if (userIds?.length) privateQuery = privateQuery.in('user_id', userIds);
  const { data: privateAccounts, error } = await privateQuery;
  if (error) throw error;
  const ids = (privateAccounts || []).map((account) => account.user_id);
  const { data: profiles } = ids.length
    ? await supabaseAdmin.from('profiles').select('id, name').in('id', ids)
    : { data: [] };
  const names = new Map((profiles || []).map((profile) => [profile.id, profile.name]));
  return (privateAccounts || [])
    .filter((account): account is typeof account & { email: string } => Boolean(account.email))
    .map((account) => ({
      id: account.user_id,
      email: account.email,
      name: names.get(account.user_id) || '',
    }));
}

export async function POST(req: NextRequest) {
  try {
    const guard = await getAdminGuard();
    if (!guard.ok) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const body = await req.json();
    const {
      template,
      subject,
      title,
      message,
      ctaLabel,
      ctaUrl,
      target,
      userIds,
    } = body as {
      template: CampaignTemplate;
      subject: string;
      title: string;
      message: string;
      ctaLabel?: string;
      ctaUrl?: string;
      target: 'all' | 'specific';
      userIds?: string[];
    };

    if (!template || !subject || !title || !message) {
      return NextResponse.json({ error: 'Champs requis manquants (template, subject, title, message)' }, { status: 400 });
    }

    if (!CAMPAIGN_PRESETS[template]) {
      return NextResponse.json({ error: 'Template invalide' }, { status: 400 });
    }

    const users = await campaignUsers(target === 'specific' ? userIds : undefined);

    if (users.length === 0) {
      return NextResponse.json({ error: 'Aucun destinataire trouvé' }, { status: 400 });
    }

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    const BATCH_SIZE = 5;
    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      const batch = users.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (user) => {
          const html = buildCampaignEmail({
            template,
            subject,
            title,
            message,
            ctaLabel,
            ctaUrl,
            recipientName: user.name || undefined,
          });
          await sendEmail({ to: user.email, subject, html });
        })
      );
      for (const r of results) {
        if (r.status === 'fulfilled') {
          sent++;
        } else {
          failed++;
          errors.push(r.reason?.message || 'Unknown error');
        }
      }
    }

    try {
      await supabaseAdmin.from('admin_email_campaigns').insert({
        admin_id: guard.userId,
        template,
        subject,
        title,
        message,
        cta_label: ctaLabel || null,
        cta_url: ctaUrl || null,
        target,
        recipient_count: users.length,
        sent_count: sent,
        failed_count: failed,
      });
    } catch {
      // table might not exist yet
    }

    return NextResponse.json({
      success: true,
      sent,
      failed,
      total: users.length,
      errors: errors.slice(0, 5),
    });
  } catch (e: any) {
    console.error('[admin/emails] Error:', e);
    return NextResponse.json({ error: e.message || 'Erreur serveur' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const guard = await getAdminGuard();
    if (!guard.ok) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    if (action === 'users') {
      const search = searchParams.get('search') || '';
      let query = supabaseAdmin
        .from('profiles')
        .select('id, name, username, avatar')
        .order('name', { ascending: true })
        .limit(50);
      if (search) {
        query = query.or(`name.ilike.%${search}%,username.ilike.%${search}%`);
      }
      const [{ data, error }, { data: emailMatches }] = await Promise.all([
        query,
        search
          ? supabaseAdmin
            .from('account_private')
            .select('user_id')
            .ilike('email', `%${search}%`)
            .limit(50)
          : Promise.resolve({ data: [] }),
      ]);
      if (error) throw error;
      const emailIds = (emailMatches || []).map((account) => account.user_id);
      const missingIds = emailIds.filter((id) => !(data || []).some((profile) => profile.id === id));
      const { data: emailProfiles } = missingIds.length
        ? await supabaseAdmin
          .from('profiles')
          .select('id, name, username, avatar')
          .in('id', missingIds)
        : { data: [] };
      const profiles = [...(data || []), ...(emailProfiles || [])].slice(0, 50);
      const ids = profiles.map((profile) => profile.id);
      const { data: privateAccounts } = ids.length
        ? await supabaseAdmin
          .from('account_private')
          .select('user_id, email')
          .in('user_id', ids)
        : { data: [] };
      const emails = new Map((privateAccounts || []).map((account) => [account.user_id, account.email]));
      return NextResponse.json({
        users: profiles.map((profile) => ({ ...profile, email: emails.get(profile.id) || null })),
      });
    }

    if (action === 'count') {
      const { count, error } = await supabaseAdmin
        .from('profiles')
        .select('id', { count: 'exact', head: true });
      if (error) throw error;
      return NextResponse.json({ count: count || 0 });
    }

    if (action === 'history') {
      try {
        const { data, error } = await supabaseAdmin
          .from('admin_email_campaigns')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20);
        if (error) throw error;
        return NextResponse.json({ campaigns: data || [] });
      } catch {
        return NextResponse.json({ campaigns: [] });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('[admin/emails] GET Error:', e);
    return NextResponse.json({ error: e.message || 'Erreur serveur' }, { status: 500 });
  }
}
