// XimaMMobile/src/services/radioService.ts
import apiService from './api';

export interface RadioData {
  name: string;
  description: string;
  status: string;
  isOnline: boolean;
  currentTrack: {
    title: string;
    artist: string;
    genre: string;
    album: string;
  };
  stats: {
    listeners: number;
    bitrate: number;
    uptime: string;
    quality: string;
  };
  technical: {
    serverName: string;
    serverDescription: string;
    contentType: string;
    serverType: string;
    serverVersion: string;
  };
  lastUpdate: string;
  streamUrl: string;
}

export interface RadioResponse {
  success: boolean;
  data: RadioData;
  source: string;
  error?: string;
  warning?: string;
}

class RadioService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = 'http://localhost:3000'; // URL de base par défaut
  }

  /**
   * Récupère les données en temps réel de la radio
   */
  async getRadioStatus(): Promise<RadioResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/radio/status`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: RadioResponse = await response.json();
      
      console.log('📻 Données radio récupérées:', {
        source: data.source,
        listeners: data.data.stats.listeners,
        currentTrack: data.data.currentTrack.title,
        quality: data.data.stats.quality
      });

      return data;

    } catch (error: any) {
      console.error('❌ Erreur récupération données radio:', error.message);
      
      // Retourner des données de fallback
      return {
        success: true,
        data: {
          name: 'Mixx Party Radio',
          description: 'Radio électronique en continu 24h/24',
          status: 'LIVE',
          isOnline: true,
          currentTrack: {
            title: 'Mixx Party Radio',
            artist: 'En boucle continue',
            genre: 'Electronic',
            album: 'Mixx Party Collection'
          },
          stats: {
            listeners: 1247,
            bitrate: 128,
            uptime: '24h/24',
            quality: 'Standard'
          },
          technical: {
            serverName: 'Mixx Party Server',
            serverDescription: 'Radio en boucle continue',
            contentType: 'audio/mpeg',
            serverType: 'Icecast',
            serverVersion: '2.4.0'
          },
          lastUpdate: new Date().toISOString(),
          streamUrl: 'https://rocket.streamradio.fr/stream/mixxparty'
        },
        source: 'fallback',
        error: error.message
      };
    }
  }

  /**
   * Récupère l'URL de streaming de la radio
   */
  getStreamUrl(): string {
    return 'https://rocket.streamradio.fr/stream/mixxparty';
  }

  /**
   * Formate le nombre d'auditeurs
   */
  formatListeners(count: number): string {
    if (count >= 1000000) {
      return (count / 1000000).toFixed(1) + 'M';
    } else if (count >= 1000) {
      return (count / 1000).toFixed(1) + 'K';
    }
    return count.toString();
  }

  /**
   * Détermine la couleur de qualité basée sur le bitrate
   */
  getQualityColor(quality: string): string {
    switch (quality.toLowerCase()) {
      case 'hd':
        return '#8B5CF6'; // Violet
      case 'high':
        return '#10B981'; // Vert
      case 'standard':
        return '#F59E0B'; // Orange
      default:
        return '#6B7280'; // Gris
    }
  }

  /**
   * Vérifie si la radio est en ligne
   */
  isRadioOnline(radioData: RadioData): boolean {
    return radioData.isOnline && radioData.status === 'LIVE';
  }

  /**
   * Calcule le temps écoulé depuis la dernière mise à jour
   */
  getTimeSinceUpdate(lastUpdate: string): string {
    const now = new Date();
    const updateTime = new Date(lastUpdate);
    const diffMs = now.getTime() - updateTime.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    
    if (diffSeconds < 60) {
      return 'À l\'instant';
    } else if (diffSeconds < 3600) {
      const minutes = Math.floor(diffSeconds / 60);
      return `Il y a ${minutes} min`;
    } else {
      const hours = Math.floor(diffSeconds / 3600);
      return `Il y a ${hours}h`;
    }
  }
}

export default new RadioService();
