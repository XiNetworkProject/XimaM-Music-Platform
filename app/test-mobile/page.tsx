'use client';

import { useState, useEffect } from 'react';
import { useAudioPlayer } from '../providers';

export default function TestMobilePage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [deviceInfo, setDeviceInfo] = useState<any>({});
  const { audioState, nextTrack, previousTrack, playTrack } = useAudioPlayer();

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  useEffect(() => {
    addLog('📱 Page de test mobile chargée');
    
    // Détecter les informations du device
    const info = {
      userAgent: navigator.userAgent,
      isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
      hasTouch: 'ontouchstart' in window,
      hasAudio: 'Audio' in window,
      hasServiceWorker: 'serviceWorker' in navigator,
      hasNotifications: 'Notification' in window,
      platform: navigator.platform,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
    };
    
    setDeviceInfo(info);
    addLog(`📱 Device: ${info.isMobile ? 'Mobile' : 'Desktop'}`);
    addLog(`📱 Touch: ${info.hasTouch ? '✅' : '❌'}`);
    addLog(`📱 Audio: ${info.hasAudio ? '✅' : '❌'}`);
    addLog(`📱 Service Worker: ${info.hasServiceWorker ? '✅' : '❌'}`);
    addLog(`📱 Notifications: ${info.hasNotifications ? '✅' : '❌'}`);
    addLog(`📱 Online: ${info.onLine ? '✅' : '❌'}`);
    
    // Tester l'audio sur mobile
    if (info.isMobile) {
      addLog('📱 Test spécifique mobile...');
      testMobileAudio();
    }
  }, []);

  const testMobileAudio = async () => {
    addLog('🎵 Test audio mobile...');
    
    try {
      // Créer un élément audio de test
      const testAudio = new Audio();
      testAudio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT';
      testAudio.volume = 0;
      
      // Tester la lecture
      await testAudio.play();
      addLog('✅ Audio.play() fonctionne sur mobile');
      testAudio.pause();
    } catch (error) {
      addLog(`❌ Erreur audio mobile: ${error}`);
    }
  };

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

  const testServiceWorker = async () => {
    addLog('🔧 Test Service Worker...');
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          addLog(`✅ Service Worker actif: ${registration.active ? 'Oui' : 'Non'}`);
          addLog(`✅ Service Worker scope: ${registration.scope}`);
        } else {
          addLog('❌ Aucun Service Worker enregistré');
        }
      } catch (error) {
        addLog(`❌ Erreur Service Worker: ${error}`);
      }
    } else {
      addLog('❌ Service Worker non supporté');
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">
          📱 Test Mobile
        </h1>

        {/* Informations du device */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <h2 className="text-lg font-semibold mb-3">Informations Device</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p>Type: {deviceInfo.isMobile ? 'Mobile' : 'Desktop'}</p>
              <p>Touch: {deviceInfo.hasTouch ? '✅' : '❌'}</p>
              <p>Audio: {deviceInfo.hasAudio ? '✅' : '❌'}</p>
              <p>Service Worker: {deviceInfo.hasServiceWorker ? '✅' : '❌'}</p>
            </div>
            <div>
              <p>Notifications: {deviceInfo.hasNotifications ? '✅' : '❌'}</p>
              <p>Online: {deviceInfo.onLine ? '✅' : '❌'}</p>
              <p>Platform: {deviceInfo.platform}</p>
              <p>Language: {deviceInfo.language}</p>
            </div>
          </div>
        </div>

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
              onClick={testServiceWorker}
              className="bg-purple-500 text-white px-3 py-2 rounded hover:bg-purple-600"
            >
              🔧 Service Worker
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