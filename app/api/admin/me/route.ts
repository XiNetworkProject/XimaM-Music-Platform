import { NextResponse } from 'next/server';
import { getAdminGuard } from '@/lib/admin';

export async function GET() {
  const g = await getAdminGuard();
  if (!g.userId) return NextResponse.json({ ok: false, error: 'Non authentifié' }, { status: 401 });
  if (!g.ok) return NextResponse.json({ ok: false, error: 'Interdit' }, { status: 403 });
  return NextResponse.json({ ok: true, isAdmin: g.isAdmin, isOwner: g.isOwner, userId: g.userId, email: g.email });
}

