'use client';

import { useState, useEffect } from 'react';

export default function DebugAudioPage() {
  const [status, setStatus] = useState<string>('Chargement...');
  const [audioService, setAudioService] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  useEffect(() => {
    addLog('🔧 Page de debug audio chargée');
    
    // Attendre le service audio
    const checkService = () => {
      if ((window as any).audioService) {
        setAudioService((window as any).audioService);
        addLog('✅ Service audio trouvé');
        checkAudioState();
      } else {
        addLog('⏳ Attente du service audio...');
        setTimeout(checkService, 500);
      }
    };
    
    checkService();
  }, []);

  const checkAudioState = () => {
    if (!audioService) return;
    
    addLog(`📊 État: ${audioService.allTracks?.length || 0} pistes, ${audioService.queue?.length || 0} en queue`);
    
    if (audioService.allTracks && audioService.allTracks.length > 0) {
      addLog(`🎵 Première piste: ${audioService.allTracks[0]?.title}`);
      setStatus('Pistes disponibles');
    } else {
      addLog('⚠️ Aucune piste chargée');
      setStatus('Pas de pistes');
    }
  };

  const loadTracks = async () => {
    addLog('📚 Chargement des pistes...');
    
    if (audioService?.actions?.loadAllTracks) {
      try {
        await audioService.actions.loadAllTracks();
        addLog('✅ Chargement terminé');
        
        setTimeout(() => {
          checkAudioState();
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

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">
          🔧 Debug Audio Immédiat
        </h1>

        {/* Statut */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <h2 className="text-lg font-semibold mb-3">Statut</h2>
          <p className="text-lg">{status}</p>
          {audioService && (
            <div className="mt-2 text-sm text-gray-600">
              <p>Service: {audioService ? '✅ Disponible' : '❌ Non disponible'}</p>
              <p>Pistes: {audioService.allTracks?.length || 0}</p>
              <p>Queue: {audioService.queue?.length || 0}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <h2 className="text-lg font-semibold mb-3">Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <button
              onClick={loadTracks}
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