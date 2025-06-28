'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAudioService } from '@/hooks/useAudioService';

export default function TestDirectPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const audioService = useAudioService();

  const addLog = useCallback((message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  }, []);

  // Vérifier l'hydratation
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    
    addLog('🎵 Page de test direct chargée');
    addLog(`📊 Service audio: ${audioService ? '✅ Disponible' : '❌ Non disponible'}`);
    
    if (audioService) {
      addLog(`📊 État initial: ${audioService.allTracks?.length || 0} pistes`);
      addLog(`📊 Actions disponibles: ${Object.keys(audioService.actions || {}).length}`);
    }
  }, [isHydrated, audioService, addLog]);

  const testLoadTracks = async () => {
    addLog('📚 Test chargement des pistes...');
    
    if (audioService?.actions?.loadAllTracks) {
      try {
        await audioService.actions.loadAllTracks();
        addLog('✅ Chargement terminé');
        
        setTimeout(() => {
          addLog(`📊 Après chargement: ${audioService.allTracks?.length || 0} pistes`);
        }, 1000);
      } catch (error) {
        addLog(`❌ Erreur: ${error}`);
      }
    } else {
      addLog('❌ Fonction loadAllTracks non disponible');
    }
  };

  const testNextTrack = () => {
    addLog('▶️ Test nextTrack...');
    
    if (audioService?.actions?.nextTrack) {
      try {
        audioService.actions.nextTrack();
        addLog('✅ nextTrack exécuté');
      } catch (error) {
        addLog(`❌ Erreur nextTrack: ${error}`);
      }
    } else {
      addLog('❌ Fonction nextTrack non disponible');
    }
  };

  const testPreviousTrack = () => {
    addLog('⏮️ Test previousTrack...');
    
    if (audioService?.actions?.previousTrack) {
      try {
        audioService.actions.previousTrack();
        addLog('✅ previousTrack exécuté');
      } catch (error) {
        addLog(`❌ Erreur previousTrack: ${error}`);
      }
    } else {
      addLog('❌ Fonction previousTrack non disponible');
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  // Éviter l'hydratation jusqu'à ce que le client soit prêt
  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-gray-100 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">
          🎵 Test Direct du Service Audio
        </h1>

        {/* État du service */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <h2 className="text-lg font-semibold mb-3">État du Service</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p>Service disponible: {audioService ? '✅' : '❌'}</p>
              <p>Pistes chargées: {audioService?.allTracks?.length || 0}</p>
              <p>Queue: {audioService?.queue?.length || 0}</p>
            </div>
            <div>
              <p>Actions disponibles: {Object.keys(audioService?.actions || {}).length}</p>
              <p>État lecture: {audioService?.state?.isPlaying ? '✅' : '❌'}</p>
              <p>Piste courante: {audioService?.state?.currentTrack?.title || 'Aucune'}</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <h2 className="text-lg font-semibold mb-3">Actions de Test</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <button
              onClick={testLoadTracks}
              className="bg-blue-500 text-white px-3 py-2 rounded hover:bg-blue-600"
            >
              📚 Charger Pistes
            </button>
            
            <button
              onClick={testNextTrack}
              className="bg-green-500 text-white px-3 py-2 rounded hover:bg-green-600"
            >
              ▶️ Suivant
            </button>
            
            <button
              onClick={testPreviousTrack}
              className="bg-yellow-500 text-white px-3 py-2 rounded hover:bg-yellow-600"
            >
              ⏮️ Précédent
            </button>
            
            <button
              onClick={clearLogs}
              className="bg-gray-500 text-white px-3 py-2 rounded hover:bg-gray-600"
            >
              🗑️ Nettoyer
            </button>
          </div>
        </div>

        {/* Logs */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold">Logs</h2>
            <span className="text-sm text-gray-500">{logs.length} messages</span>
          </div>
          <div className="bg-gray-900 text-green-400 p-4 rounded h-64 overflow-y-auto font-mono text-sm">
            {logs.length === 0 ? (
              <p className="text-gray-500">Aucun log pour le moment...</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 