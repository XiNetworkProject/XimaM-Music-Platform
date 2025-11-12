import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const dept = searchParams.get('dept'); // Code département (ex: "59" pour Nord)

    // API Vigilance Météo-France (data.gouv.fr)
    // Documentation: https://www.data.gouv.fr/fr/datasets/bulletin-de-vigilance-meteorologique/
    const vigilanceUrl = dept
      ? `https://public.opendatasoft.com/api/explore/v2.1/catalog/datasets/vigilance-meteorologique/records?where=code_departement%3D%22${dept}%22&limit=1&order_by=date_publication%20desc`
      : `https://public.opendatasoft.com/api/explore/v2.1/catalog/datasets/vigilance-meteorologique/records?limit=100&order_by=date_publication%20desc`;

    const response = await fetch(vigilanceUrl, {
      next: { revalidate: 600 } // Cache 10 minutes
    });

    if (!response.ok) {
      throw new Error('Erreur API Vigilance');
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Erreur API vigilance:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des alertes' },
      { status: 500 }
    );
  }
}

