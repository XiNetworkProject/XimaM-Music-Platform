import { NextRequest, NextResponse } from 'next/server';

interface UpdateCheck {
  currentVersion: string;
  platform: string;
  deviceId: string;
}

interface UpdateResponse {
  available: boolean;
  version?: string;
  downloadUrl?: string;
  changelog?: string;
  isRequired?: boolean;
  size?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: UpdateCheck = await request.json();
    const { currentVersion, platform, deviceId } = body;

    // Version actuelle de l'app
    const appVersion = process.env.APP_VERSION || '1.0.0';
    
    // Simuler une vérification de mise à jour
    // En production, vous compareriez avec une base de données ou un fichier de configuration
    const latestVersion = '1.0.1'; // Version la plus récente
    
    const hasUpdate = compareVersions(latestVersion, currentVersion) > 0;
    
    if (hasUpdate) {
      const update: UpdateResponse = {
        available: true,
        version: latestVersion,
        downloadUrl: `${process.env.NEXTAUTH_URL}/api/updates/download/${latestVersion}`,
        changelog: `
• Correction de bugs mineurs
• Amélioration des performances
• Nouvelles fonctionnalités
• Interface utilisateur améliorée
        `.trim(),
        isRequired: false,
        size: '15.2 MB',
      };
      
      return NextResponse.json(update);
    }
    
    return NextResponse.json({ available: false });

  } catch (error) {
    console.error('Erreur vérification mise à jour:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la vérification' },
      { status: 500 }
    );
  }
}

// Fonction pour comparer les versions
function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = parts1[i] || 0;
    const part2 = parts2[i] || 0;
    
    if (part1 > part2) return 1;
    if (part1 < part2) return -1;
  }
  
  return 0;
} 