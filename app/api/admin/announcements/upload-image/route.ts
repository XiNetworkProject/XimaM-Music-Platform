import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export const dynamic = 'force-dynamic';

const ADMIN_EMAIL = 'vermeulenmaxime59@gmail.com';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || session.user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  try {
    const { timestamp, publicId } = await req.json();
    if (!timestamp || !publicId) return NextResponse.json({ error: 'timestamp et publicId requis' }, { status: 400 });

    const res = await fetch(`${process.env.NEXTAUTH_URL}/api/upload/signature`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timestamp, publicId, resourceType: 'image' })
    });
    const json = await res.json();
    if (!res.ok) return NextResponse.json(json, { status: res.status });
    return NextResponse.json(json);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erreur' }, { status: 500 });
  }
}

