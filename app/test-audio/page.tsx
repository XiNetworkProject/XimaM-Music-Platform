'use client';

import { useState, useEffect } from 'react';
import { useAudioPlayer } from '../providers';

export default function TestAudioPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const { audioState, nextTrack, previousTrack, playTrack } = useAudioPlayer();

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  useEffect(() => {
    addLog('🎵 Page de test audio chargée');
    addLog(`📊 État: ${audioState.tracks.length} pistes, lecture: ${audioState.isPlaying}`);
  }, []);

  const testNextTrack = () => {
    addLog('▶️ Test bouton suivant...');
    try {
      nextTrack();
      addLog('✅ Bouton suivant exécuté');
    } catch (error) {
      addLog(`❌ Erreur bouton suivant: ${error}`);
    }
  };

  const testPreviousTrack = () => {
    addLog('⏮️ Test bouton précédent...');
    try {
      previousTrack();
      addLog('✅ Bouton précédent exécuté');
    } catch (error) {
      addLog(`❌ Erreur bouton précédent: ${error}`);
    }
  };

  const loadTestTracks = async () => {
    addLog('📚 Chargement de pistes de test...');
    try {
      const response = await fetch('/api/tracks');
      if (response.ok) {
        const tracks = await response.json();
        addLog(`✅ ${tracks.length} pistes chargées`);
        
        if (tracks.length > 0) {
          addLog(`🎵 Test lecture de: ${tracks[0].title}`);
          await playTrack(tracks[0]);
        }
      } else {
        addLog(`❌ Erreur chargement: ${response.status}`);
      }
    } catch (error) {
      addLog(`❌ Erreur: ${error}`);
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">
          🎵 Test Navigation Audio
        </h1>

        {/* État actuel */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <h2 className="text-lg font-semibold mb-3">État Actuel</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p>Pistes chargées: {audioState.tracks.length}</p>
              <p>Piste actuelle: {audioState.currentTrackIndex}</p>
              <p>En lecture: {audioState.isPlaying ? '✅' : '❌'}</p>
            </div>
            <div>
              <p>Piste courante: {audioState.tracks[audioState.currentTrackIndex]?.title || 'Aucune'}</p>
              <p>Artiste: {audioState.tracks[audioState.currentTrackIndex]?.artist?.name || 'Inconnu'}</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <h2 className="text-lg font-semibold mb-3">Actions de Test</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <button
              onClick={loadTestTracks}
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
              🗑️ Nettoyer Logs
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