import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function getCallerMember(userId: string) {
  const { data } = await supabaseAdmin
    .from('meteo_team_members')
    .select('id, role, status, display_name')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();
  return data;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ isMember: false }, { status: 401 });
    }

    const member = await getCallerMember(session.user.id);

    if (!member) {
      return NextResponse.json({ isMember: false });
    }

    if (['admin', 'moderator'].includes(member.role)) {
      const { data: allMembers } = await supabaseAdmin
        .from('meteo_team_members')
        .select('*')
        .order('invited_at', { ascending: false });

      const userIds = (allMembers || []).map((m: any) => m.user_id);
      const profileMap: Record<string, any> = {};

      if (userIds.length > 0) {
        const { data: profiles } = await supabaseAdmin
          .from('profiles')
          .select('id, name, avatar, email')
          .in('id', userIds);
        if (profiles) {
          for (const p of profiles) profileMap[p.id] = p;
        }
      }

      const members = (allMembers || []).map((m: any) => ({
        ...m,
        profile: profileMap[m.user_id] || null,
      }));

      return NextResponse.json({
        isMember: true,
        role: member.role,
        displayName: member.display_name,
        members,
      });
    }

    return NextResponse.json({
      isMember: true,
      role: member.role,
      displayName: member.display_name,
    });
  } catch {
    return NextResponse.json({ isMember: false }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const caller = await getCallerMember(session.user.id);
    if (!caller || caller.role !== 'admin') {
      return NextResponse.json({ error: 'Acces refuse (admin requis)' }, { status: 403 });
    }

    const { email, role } = await request.json();
    if (!email?.trim()) {
      return NextResponse.json({ error: 'Email requis' }, { status: 400 });
    }

    const validRoles = ['admin', 'moderator', 'contributor'];
    const memberRole = validRoles.includes(role) ? role : 'contributor';

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, name')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();

    if (!profile) {
      return NextResponse.json({ error: 'Aucun utilisateur Synaura avec cet email' }, { status: 404 });
    }

    const { data: existing } = await supabaseAdmin
      .from('meteo_team_members')
      .select('id, status')
      .eq('user_id', profile.id)
      .maybeSingle();

    if (existing) {
      if (existing.status === 'active') {
        return NextResponse.json({ error: 'Ce membre fait deja partie de l\'equipe' }, { status: 409 });
      }
      await supabaseAdmin
        .from('meteo_team_members')
        .update({ status: 'active', role: memberRole, accepted_at: new Date().toISOString() })
        .eq('id', existing.id);
      return NextResponse.json({ success: true });
    }

    const { error: insertError } = await supabaseAdmin
      .from('meteo_team_members')
      .insert({
        user_id: profile.id,
        role: memberRole,
        display_name: profile.name || email,
        invited_by: session.user.id,
        status: 'active',
        accepted_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error('Erreur invitation:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('Erreur POST /api/meteo/team:', e);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const caller = await getCallerMember(session.user.id);
    if (!caller || caller.role !== 'admin') {
      return NextResponse.json({ error: 'Acces refuse (admin requis)' }, { status: 403 });
    }

    const { memberId, role, status } = await request.json();
    if (!memberId) {
      return NextResponse.json({ error: 'memberId requis' }, { status: 400 });
    }

    const { data: target } = await supabaseAdmin
      .from('meteo_team_members')
      .select('id, user_id, role')
      .eq('id', memberId)
      .single();

    if (!target) {
      return NextResponse.json({ error: 'Membre introuvable' }, { status: 404 });
    }

    if (target.user_id === session.user.id) {
      return NextResponse.json({ error: 'Vous ne pouvez pas modifier votre propre role' }, { status: 400 });
    }

    const updates: any = {};
    if (role && ['admin', 'moderator', 'contributor'].includes(role)) updates.role = role;
    if (status && ['active', 'pending', 'revoked'].includes(status)) updates.status = status;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Rien a mettre a jour' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('meteo_team_members')
      .update(updates)
      .eq('id', memberId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('Erreur PATCH /api/meteo/team:', e);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const caller = await getCallerMember(session.user.id);
    if (!caller || caller.role !== 'admin') {
      return NextResponse.json({ error: 'Acces refuse (admin requis)' }, { status: 403 });
    }

    const { memberId } = await request.json();
    if (!memberId) {
      return NextResponse.json({ error: 'memberId requis' }, { status: 400 });
    }

    const { data: target } = await supabaseAdmin
      .from('meteo_team_members')
      .select('user_id')
      .eq('id', memberId)
      .single();

    if (!target) {
      return NextResponse.json({ error: 'Membre introuvable' }, { status: 404 });
    }

    if (target.user_id === session.user.id) {
      return NextResponse.json({ error: 'Vous ne pouvez pas vous retirer vous-meme' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('meteo_team_members')
      .delete()
      .eq('id', memberId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('Erreur DELETE /api/meteo/team:', e);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
