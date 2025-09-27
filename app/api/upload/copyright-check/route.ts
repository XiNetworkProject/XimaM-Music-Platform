import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { audioUrl, title, artist } = await req.json();
    if (!audioUrl || typeof audioUrl !== 'string') {
      return NextResponse.json({ error: 'audioUrl requis' }, { status: 400 });
    }

    const token = process.env.AUDD_API_TOKEN;
    if (!token) {
      // Pas de clé → ne pas bloquer, retourner no-op
      return NextResponse.json({ matched: false, reason: 'NO_TOKEN' });
    }

    const form = new URLSearchParams();
    form.set('api_token', token);
    form.set('url', audioUrl);
    // Reconnaissance basique
    // Docs: https://docs.audd.io/
    const resp = await fetch('https://api.audd.io/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `method=recognize&${form.toString()}`
    });

    if (!resp.ok) {
      return NextResponse.json({ matched: false, reason: 'AUDD_ERROR', status: resp.status }, { status: 200 });
    }

    const data = await resp.json().catch(() => ({}));
    const result = data?.result || null;

    if (!result) {
      return NextResponse.json({ matched: false });
    }

    // Certaines réponses ont un score/accuracy, sinon on renvoie brut
    const matched = true;
    const details = {
      title: result.title || null,
      artist: result.artist || null,
      album: result.album || null,
      label: result.label || null,
      release_date: result.release_date || null,
      score: result.score || result.accuracy || null,
      resultRaw: result,
      inputTitle: title || null,
      inputArtist: artist || null,
    };

    return NextResponse.json({ matched, details });
  } catch (error) {
    return NextResponse.json({ matched: false, reason: 'EXCEPTION' }, { status: 200 });
  }
}


