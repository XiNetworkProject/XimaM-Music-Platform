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

    // Open-Meteo Air Quality API
    const airQualityUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,uv_index&timezone=Europe/Paris&forecast_days=2`;

    const response = await fetch(airQualityUrl, {
      next: { revalidate: 3600 } // Cache 1 heure
    });

    if (!response.ok) {
      throw new Error('Erreur API Air Quality');
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Erreur API air quality:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de la qualité de l\'air' },
      { status: 500 }
    );
  }
}

