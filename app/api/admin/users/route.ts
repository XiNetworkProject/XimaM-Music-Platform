import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAdminGuard, getOwnerEmails } from '@/lib/admin';

function norm(s: any) {
  return String(s || '').trim();
}

function isUuid(s: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(s || '').trim());
}

export async function GET(req: NextRequest) {
  const g = await getAdminGuard();
  if (!g.userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  if (!g.ok) return NextResponse.json({ error: 'Interdit' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const q = norm(searchParams.get('q'));
  const role = norm(searchParams.get('role')) || 'admin';
  const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') || 20)));
  const { data: emailMatches } = q
    ? await supabaseAdmin
      .from('account_private')
      .select('user_id')
      .ilike('email', `%${q}%`)
      .limit(limit)
    : { data: [] };
  const emailMatchIds = (emailMatches || []).map((row) => row.user_id);

  let query = supabaseAdmin
    .from('profiles')
    .select('id,username,name,artist_name,role,is_artist,is_verified,updated_at')
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (role && role !== 'all') query = query.eq('role', role);
  if (q) {
    const clauses = [
      `username.ilike.%${q}%`,
      `name.ilike.%${q}%`,
      `artist_name.ilike.%${q}%`,
    ];
    if (isUuid(q)) clauses.push(`id.eq.${q}`);
    if (emailMatchIds.length) clauses.push(`id.in.(${emailMatchIds.join(',')})`);
    query = query.or(clauses.join(','));
  }

  const { data, error } = await query;
  if (error) {
    const msg = String(error.message || 'Erreur');
    if (/column\s+\"?role\"?\s+does not exist/i.test(msg) || /profiles\.role/i.test(msg)) {
      return NextResponse.json(
        {
          error:
            "Schéma Supabase incomplet: la colonne `profiles.role` est manquante en production. Exécute le script `scripts/add_profiles_role.sql` dans Supabase (SQL Editor), puis réessaie.",
        },
        { status: 500 },
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
  const ids = (data || []).map((profile) => profile.id);
  const { data: privateAccounts } = ids.length
    ? await supabaseAdmin.from('account_private').select('user_id,email').in('user_id', ids)
    : { data: [] };
  const emails = new Map((privateAccounts || []).map((account) => [account.user_id, account.email]));
  return NextResponse.json({
    items: (data || []).map((profile) => ({ ...profile, email: emails.get(profile.id) || null })),
  });
}

export async function PATCH(req: NextRequest) {
  const g = await getAdminGuard();
  if (!g.userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  if (!g.ok) return NextResponse.json({ error: 'Interdit' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const userId = norm(body?.userId);
  const email = norm(body?.email).toLowerCase();
  const role = norm(body?.role);

  if (!userId && !email) return NextResponse.json({ error: 'userId ou email manquant' }, { status: 400 });
  if (!['user', 'artist', 'admin'].includes(role)) return NextResponse.json({ error: 'role invalide' }, { status: 400 });

  // Only owner can change roles to/from admin
  const toAdmin = role === 'admin';
  if (toAdmin && !g.isOwner && !g.isAdmin) return NextResponse.json({ error: 'Interdit' }, { status: 403 });
  if (!g.isOwner && !g.isAdmin) return NextResponse.json({ error: 'Interdit' }, { status: 403 });

  // Resolve target by email if needed
  let resolvedUserId = userId;
  if (!resolvedUserId && email) {
    const { data: byEmail } = await supabaseAdmin
      .from('account_private')
      .select('user_id')
      .ilike('email', email)
      .maybeSingle();
    resolvedUserId = byEmail?.user_id || '';
    if (!resolvedUserId) {
      return NextResponse.json(
        { error: "Utilisateur introuvable. Il doit créer un compte (et donc un profil) avant qu'on puisse lui attribuer un rôle." },
        { status: 404 },
      );
    }
  }

  // Safety: prevent removing owner access via role change if owner isn't admin yet
  const owners = getOwnerEmails();
  const { data: targetAccount } = await supabaseAdmin
    .from('account_private')
    .select('email')
    .eq('user_id', resolvedUserId)
    .maybeSingle();
  const targetEmail = (targetAccount?.email || '').toLowerCase();
  const isTargetOwner = targetEmail ? owners.includes(targetEmail) : false;
  if (isTargetOwner && role !== 'admin') {
    return NextResponse.json({ error: 'Impossible de retirer les droits owner (bootstrap)' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update({ role })
    .eq('id', resolvedUserId)
    .select('id,username,name,role,is_artist,is_verified,updated_at')
    .single();
  if (error) {
    const msg = String(error.message || 'Erreur update');
    if (/column\s+\"?role\"?\s+does not exist/i.test(msg) || /profiles\.role/i.test(msg)) {
      return NextResponse.json(
        {
          error:
            "Schéma Supabase incomplet: la colonne `profiles.role` est manquante en production. Exécute le script `scripts/add_profiles_role.sql` dans Supabase (SQL Editor), puis réessaie.",
        },
        { status: 500 },
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ ok: true, user: { ...data, email: targetAccount?.email || null } });
}

// Certains proxies/CDN ne forwardent pas PATCH correctement. Alias en POST pour la prod.
export async function POST(req: NextRequest) {
  return PATCH(req);
}
