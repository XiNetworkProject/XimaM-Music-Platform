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

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const member = await getTeamMember(session.user.id);
    if (!member) {
      return NextResponse.json({ error: 'Accès réservé à l\'équipe météo' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';

    let query = supabaseAdmin
      .from('meteo_alerts')
      .select('*')
      .order('sent_at', { ascending: false });

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data: alerts, error } = await query;

    if (error) {
      return NextResponse.json({ error: 'Erreur lors de la récupération des alertes', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ alerts: alerts || [] });
  } catch (error) {
    console.error('Erreur API meteo/alerts GET:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const member = await getTeamMember(session.user.id);
    if (!member || !['admin', 'moderator'].includes(member.role)) {
      return NextResponse.json({ error: 'Accès réservé aux administrateurs et modérateurs' }, { status: 403 });
    }

    const body = await request.json();
    const { title, content, severity, regions, expiresAt } = body as {
      title: string;
      content?: string;
      severity: string;
      regions?: string[];
      expiresAt?: string;
    };

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Titre requis' }, { status: 400 });
    }

    if (!severity || !['info', 'warning', 'danger', 'critical'].includes(severity)) {
      return NextResponse.json({ error: 'Sévérité invalide (info, warning, danger, critical)' }, { status: 400 });
    }

    const { data: alert, error: insertError } = await supabaseAdmin
      .from('meteo_alerts')
      .insert({
        title: title.trim(),
        content: content?.trim() || null,
        severity,
        regions: regions || [],
        sent_by: member.id,
        expires_at: expiresAt || null,
        is_active: true,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: 'Erreur lors de la création de l\'alerte', details: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ alert });
  } catch (error) {
    console.error('Erreur API meteo/alerts POST:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
