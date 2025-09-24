import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';
import { deleteFile } from '@/lib/cloudinary';

export const dynamic = 'force-dynamic';

const ADMIN_EMAIL = 'vermeulenmaxime59@gmail.com';

function assertAdmin(session: any) {
  if (!session?.user?.email || session.user.email !== ADMIN_EMAIL) {
    throw new Error('Non autorisé');
  }
}

// POST: créer une annonce
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  try {
    assertAdmin(session);
  } catch {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const body = await req.json();
  const { title, body: text, image_url, image_public_id, priority = 0, published = true, starts_at, ends_at } = body || {};
  if (!title) return NextResponse.json({ error: 'title requis' }, { status: 400 });

  const { data, error } = await supabaseAdmin.from('announcements').insert({
    title,
    body: text,
    image_url,
    image_public_id,
    priority,
    published,
    starts_at: starts_at || null,
    ends_at: ends_at || null,
    author_id: session?.user?.id || null,
  }).select('*').maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data });
}

// PUT: mettre à jour une annonce
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  try {
    assertAdmin(session);
  } catch {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const body = await req.json();
  const { id, ...updates } = body || {};
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 });

  const { data, error } = await supabaseAdmin.from('announcements').update({
    ...updates,
  }).eq('id', id).select('*').maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data });
}

// DELETE: supprimer une annonce
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  try {
    assertAdmin(session);
  } catch {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 });

  // Trouver l'item pour récupérer l'image
  const { data: item } = await supabaseAdmin.from('announcements').select('image_public_id').eq('id', id).maybeSingle();
  const { error } = await supabaseAdmin.from('announcements').delete().eq('id', id);
  if (!error && item?.image_public_id) {
    try { await deleteFile(item.image_public_id, 'image'); } catch {}
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

