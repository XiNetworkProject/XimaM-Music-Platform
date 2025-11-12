import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');

    if (!query) {
      return NextResponse.json({ error: 'Paramètre q (query) requis' }, { status: 400 });
    }

    // Open-Meteo Geocoding API (gratuit, sans clé)
    const geocodeUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=10&language=fr&format=json`;

    const response = await fetch(geocodeUrl, {
      next: { revalidate: 86400 } // Cache 24h
    });

    if (!response.ok) {
      throw new Error('Erreur API Geocoding');
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Erreur API geocode:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la recherche de lieu' },
      { status: 500 }
    );
  }
}

