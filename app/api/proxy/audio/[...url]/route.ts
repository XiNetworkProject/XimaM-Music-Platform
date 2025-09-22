import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { url: string } }
) {
  try {
    const { url } = params;
    
    if (!url) {
      return NextResponse.json({ error: 'URL manquante' }, { status: 400 });
    }

    // Décoder l'URL
    const decodedUrl = decodeURIComponent(url);
    
    // Vérifier que c'est une URL Cloudinary valide
    if (!decodedUrl.includes('res.cloudinary.com')) {
      return NextResponse.json({ error: 'URL non autorisée' }, { status: 403 });
    }

    console.log('🎵 Proxy audio:', decodedUrl);

    // Récupérer le fichier audio depuis Cloudinary
    const response = await fetch(decodedUrl);
    
    if (!response.ok) {
      console.error('❌ Erreur récupération audio:', response.status);
      return NextResponse.json({ error: 'Fichier audio non trouvé' }, { status: 404 });
    }

    // Retourner le fichier audio avec les bons headers
    const audioBuffer = await response.arrayBuffer();
    
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': response.headers.get('content-type') || 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
        'Cache-Control': 'public, max-age=31536000', // Cache 1 an
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });

  } catch (error) {
    console.error('❌ Erreur proxy audio:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
