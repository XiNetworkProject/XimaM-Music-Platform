import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function getTeamMember(userId: string) {
  const { data } = await supabaseAdmin
    .from('meteo_team_members')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();
  return data;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const member = await getTeamMember(session.user.id);
    if (!member) {
      return NextResponse.json({ error: 'Accès réservé à l\'équipe météo' }, { status: 403 });
    }

    const body = await request.json();
    const { is_active, title, content, severity } = body as {
      is_active?: boolean;
      title?: string;
      content?: string;
      severity?: string;
    };

    const updates: Record<string, any> = {};
    if (typeof is_active === 'boolean') updates.is_active = is_active;
    if (title !== undefined) updates.title = title.trim();
    if (content !== undefined) updates.content = content.trim();
    if (severity !== undefined) {
      if (!['info', 'warning', 'danger', 'critical'].includes(severity)) {
        return NextResponse.json({ error: 'Sévérité invalide' }, { status: 400 });
      }
      updates.severity = severity;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Aucune modification fournie' }, { status: 400 });
    }

    const { data: alert, error } = await supabaseAdmin
      .from('meteo_alerts')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Erreur lors de la mise à jour de l\'alerte', details: error.message }, { status: 500 });
    }

    if (!alert) {
      return NextResponse.json({ error: 'Alerte introuvable' }, { status: 404 });
    }

    return NextResponse.json({ alert });
  } catch (error) {
    console.error('Erreur API meteo/alerts/[id] PATCH:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
