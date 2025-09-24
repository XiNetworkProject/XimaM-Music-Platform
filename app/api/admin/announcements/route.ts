import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const ADMIN_EMAIL = 'vermeulenmaxime59@gmail.com';

// Vérifier si l'utilisateur est admin
async function isAdmin(session: any): Promise<boolean> {
  if (!session?.user?.email) return false;
  return session.user.email === ADMIN_EMAIL;
}

// GET - Récupérer toutes les annonces (admin)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    const { data: announcements, error } = await supabaseAdmin
      .from('announcements')
      .select('*')
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Erreur récupération annonces admin:', error);
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }

    return NextResponse.json({ announcements: announcements || [] });
  } catch (error) {
    console.error('Erreur API annonces admin:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}

// POST - Créer une nouvelle annonce
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    const body = await req.json();
    const { title, description, background_image_url, background_color, order_index } = body;

    if (!title || !description) {
      return NextResponse.json({ error: 'Titre et description requis' }, { status: 400 });
    }

    const { data: announcement, error } = await supabaseAdmin
      .from('announcements')
      .insert({
        title,
        description,
        background_image_url,
        background_color: background_color || '#6366f1',
        order_index: order_index || 0,
        created_by: session.user.id
      })
      .select()
      .single();

    if (error) {
      console.error('Erreur création annonce:', error);
      return NextResponse.json({ error: 'Erreur création' }, { status: 500 });
    }

    return NextResponse.json({ announcement });
  } catch (error) {
    console.error('Erreur API création annonce:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}

// PUT - Mettre à jour une annonce
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    const body = await req.json();
    const { id, title, description, background_image_url, background_color, order_index, is_active } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID requis' }, { status: 400 });
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (background_image_url !== undefined) updateData.background_image_url = background_image_url;
    if (background_color !== undefined) updateData.background_color = background_color;
    if (order_index !== undefined) updateData.order_index = order_index;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data: announcement, error } = await supabaseAdmin
      .from('announcements')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erreur mise à jour annonce:', error);
      return NextResponse.json({ error: 'Erreur mise à jour' }, { status: 500 });
    }

    return NextResponse.json({ announcement });
  } catch (error) {
    console.error('Erreur API mise à jour annonce:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}

// DELETE - Supprimer une annonce
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID requis' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('announcements')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erreur suppression annonce:', error);
      return NextResponse.json({ error: 'Erreur suppression' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur API suppression annonce:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
