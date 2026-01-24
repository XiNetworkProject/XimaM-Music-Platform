import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAdminGuard, getOwnerEmails } from '@/lib/admin';

function norm(s: any) {
  return String(s || '').trim();
}

export async function GET(req: NextRequest) {
  const g = await getAdminGuard();
  if (!g.userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  if (!g.ok) return NextResponse.json({ error: 'Interdit' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const q = norm(searchParams.get('q'));
  const role = norm(searchParams.get('role')) || 'admin';
  const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') || 20)));

  let query = supabaseAdmin
    .from('profiles')
    .select('id,email,username,name,role,is_artist,is_verified,updated_at')
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (role && role !== 'all') query = query.eq('role', role);
  if (q) {
    // search by email or username or name
    query = query.or(`email.ilike.%${q}%,username.ilike.%${q}%,name.ilike.%${q}%`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message || 'Erreur' }, { status: 500 });
  return NextResponse.json({ items: data || [] });
}

export async function PATCH(req: NextRequest) {
  const g = await getAdminGuard();
  if (!g.userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  if (!g.ok) return NextResponse.json({ error: 'Interdit' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const userId = norm(body?.userId);
  const role = norm(body?.role);

  if (!userId) return NextResponse.json({ error: 'userId manquant' }, { status: 400 });
  if (!['user', 'artist', 'admin'].includes(role)) return NextResponse.json({ error: 'role invalide' }, { status: 400 });

  // Only owner can change roles to/from admin
  const toAdmin = role === 'admin';
  if (toAdmin && !g.isOwner && !g.isAdmin) return NextResponse.json({ error: 'Interdit' }, { status: 403 });
  if (!g.isOwner && !g.isAdmin) return NextResponse.json({ error: 'Interdit' }, { status: 403 });

  // Safety: prevent removing owner access via role change if owner isn't admin yet
  const owners = getOwnerEmails();
  const { data: target } = await supabaseAdmin.from('profiles').select('id,email,role').eq('id', userId).maybeSingle();
  const targetEmail = (target?.email || '').toLowerCase();
  const isTargetOwner = targetEmail ? owners.includes(targetEmail) : false;
  if (isTargetOwner && role !== 'admin') {
    return NextResponse.json({ error: 'Impossible de retirer les droits owner (bootstrap)' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update({ role })
    .eq('id', userId)
    .select('id,email,username,name,role,is_artist,is_verified,updated_at')
    .single();
  if (error) return NextResponse.json({ error: error.message || 'Erreur update' }, { status: 500 });

  return NextResponse.json({ ok: true, user: data });
}

