'use client';

import { useState, useEffect } from 'react';
import { usePlaysContext } from '@/contexts/PlaysContext';
import { useAudioService } from '@/hooks/useAudioService';
import { AnimatedPlaysCounter } from './AnimatedCounter';
import { Headphones } from 'lucide-react';

export default function PlaysTest() {
  const { getPlays } = usePlaysContext();
  const { state: audioState } = useAudioService();
  const [testTrackId] = useState('test-track-123');
  const [plays, setPlays] = useState(0);

  // Récupérer les écoutes actuelles
  useEffect(() => {
    const currentPlays = getPlays(testTrackId);
    setPlays(currentPlays?.plays || 0);
  }, [getPlays, testTrackId]);

  // Écouter les changements d'écoutes
  useEffect(() => {
    const handlePlaysUpdate = () => {
      const currentPlays = getPlays(testTrackId);
      setPlays(currentPlays?.plays || 0);
    };

    window.addEventListener('playsUpdated', handlePlaysUpdate);
    return () => window.removeEventListener('playsUpdated', handlePlaysUpdate);
  }, [getPlays, testTrackId]);

  const simulatePlaysIncrement = () => {
    // Simuler un incrément d'écoutes
    window.dispatchEvent(new CustomEvent('trackPlayed', {
      detail: { trackId: testTrackId }
    }));
  };

  const simulateTrackChange = () => {
    // Simuler un changement de piste
    window.dispatchEvent(new CustomEvent('trackChanged', {
      detail: { trackId: testTrackId }
    }));
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-black/80 backdrop-blur-sm rounded-lg p-4 border border-white/20">
      <h3 className="text-white font-semibold mb-4">🎵 Test Écoutes</h3>
      
      <div className="space-y-4">
        {/* Compteur d'écoutes animé */}
        <div className="flex items-center gap-3">
          <span className="text-white text-sm">Écoutes:</span>
          <AnimatedPlaysCounter
            value={plays}
            size="md"
            variant="minimal"
            showIcon={true}
            icon={<Headphones size={16} />}
            animation="slide"
            className="text-blue-400"
          />
        </div>

        {/* Piste actuelle */}
        <div className="text-xs text-gray-400">
          <p>Piste actuelle: {audioState.currentTrack?.title || 'Aucune'}</p>
          <p>ID de test: {testTrackId}</p>
        </div>

        {/* Boutons de test */}
        <div className="flex gap-2">
          <button
            onClick={simulatePlaysIncrement}
            className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
          >
            +1 Écoute
          </button>
          <button
            onClick={simulateTrackChange}
            className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
          >
            Changer Piste
          </button>
        </div>

        {/* Informations */}
        <div className="text-xs text-gray-400 mt-4 pt-3 border-t border-white/10">
          <p>🎯 Test de synchronisation</p>
          <p>🔄 Événements temps réel</p>
          <p>💫 Animations automatiques</p>
        </div>
      </div>
    </div>
  );
} 