import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const lat = searchParams.get('lat');
    const lon = searchParams.get('lon');
    const days = searchParams.get('days') || '7';

    if (!lat || !lon) {
      return NextResponse.json({ error: 'Latitude et longitude requises' }, { status: 400 });
    }

    // Open-Meteo Forecast API (gratuit, sans clé)
    const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m,wind_gusts_10m,wind_direction_10m,uv_index&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,weather_code,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant,uv_index_max&timezone=Europe/Paris&forecast_days=${days}`;

    const response = await fetch(forecastUrl, {
      next: { revalidate: 300 } // Cache 5 minutes
    });

    if (!response.ok) {
      throw new Error('Erreur API Open-Meteo');
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Erreur API forecast:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des prévisions' },
      { status: 500 }
    );
  }
}

