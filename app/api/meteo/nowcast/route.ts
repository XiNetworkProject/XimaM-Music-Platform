import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const lat = searchParams.get('lat');
    const lon = searchParams.get('lon');

    if (!lat || !lon) {
      return NextResponse.json({ error: 'Latitude et longitude requises' }, { status: 400 });
    }

    // Open-Meteo Nowcast API (prévisions très court terme)
    const nowcastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m,wind_gusts_10m&forecast_hours=6&timezone=Europe/Paris`;

    const response = await fetch(nowcastUrl, {
      next: { revalidate: 60 } // Cache 1 minute
    });

    if (!response.ok) {
      throw new Error('Erreur API Open-Meteo Nowcast');
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Erreur API nowcast:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du nowcast' },
      { status: 500 }
    );
  }
}

