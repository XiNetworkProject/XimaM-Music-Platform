'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  Image, 
  Video, 
  Mic, 
  ArrowLeft, 
  MoreVertical,
  Play,
  Pause,
  Volume2,
  X,
  Check,
  Clock,
  Paperclip,
  Settings
} from 'lucide-react';
import toast from 'react-hot-toast';
import React from 'react';

interface Message {
  _id: string;
  sender: {
    _id: string;
    name: string;
    username: string;
    avatar?: string;
  };
  type: 'text' | 'image' | 'video' | 'audio';
  content: string;
  duration?: number;
  seenBy: string[];
  createdAt: string;
}

interface Conversation {
  _id: string;
  participants: Array<{
    _id: string;
    name: string;
    username: string;
    avatar?: string;
  }>;
  accepted: boolean;
}

// Fonction pour formater la durée d'enregistrement
const formatRecordingDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

function MessageInputBar({
  newMessage,
  setNewMessage,
  handleSendText,
  handleFileSelect,
  fileInputRef,
  isRecording,
  startRecording,
  stopRecording,
  uploading,
  testMicrophoneAccess,
  showSystemInfo,
  recordingPreview,
  recordingDuration,
  isPreviewPlaying,
  playPreview,
  stopPreview,
  sendRecording,
  cancelRecording
}: any) {
  return (
    <div className="fixed bottom-16 left-0 w-full z-40 px-2 py-2 bg-white/10 backdrop-blur-md border-t border-white/20 flex items-center gap-2 rounded-t-2xl shadow-2xl">
      {/* Bouton pièce jointe */}
      <button
        className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors shadow-md flex-shrink-0"
        onClick={() => fileInputRef.current?.click()}
        title="Envoyer un média"
      >
        <Paperclip size={18} className="text-purple-300" />
      </button>
      
      {/* Bouton microphone ou prévisualisation */}
      {!recordingPreview ? (
        <button
          className={`p-2 rounded-full transition-all duration-200 shadow-md flex-shrink-0 relative ${
            isRecording 
              ? 'bg-red-500 hover:bg-red-600 scale-110' 
              : 'bg-white/20 hover:bg-white/30'
          }`}
          onMouseDown={startRecording}
          onMouseUp={stopRecording}
          onMouseLeave={stopRecording}
          onTouchStart={startRecording}
          onTouchEnd={stopRecording}
          title={isRecording ? 'Relâchez pour arrêter' : 'Maintenez pour enregistrer'}
        >
          <Mic size={18} className="text-purple-300" />
          {/* Animation d'enregistrement */}
          {isRecording && (
            <div className="absolute -top-1 -right-1 flex space-x-0.5">
              <div className="w-1 h-1 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '0s' }}></div>
              <div className="w-1 h-1 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-1 h-1 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            </div>
          )}
        </button>
      ) : (
        // Interface de prévisualisation compacte
        <div className="flex items-center space-x-1 bg-purple-600/20 rounded-lg px-2 py-1 flex-shrink-0">
          <button
            className="p-1 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            onClick={isPreviewPlaying ? stopPreview : playPreview}
            title={isPreviewPlaying ? 'Arrêter' : 'Écouter'}
          >
            {isPreviewPlaying ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <span className="text-white font-mono text-xs">
            {formatRecordingDuration(recordingDuration)}
          </span>
        </div>
      )}
      
      {/* Zone de saisie de texte - priorité maximale */}
      <input
        type="text"
        value={newMessage}
        onChange={(e) => setNewMessage(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && handleSendText()}
        placeholder="Tapez votre message..."
        className="flex-1 min-w-0 px-3 py-2 bg-white/20 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-md text-sm"
        disabled={uploading || isRecording}
      />
      
      {/* Boutons d'action - côté droit */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Boutons de diagnostic - seulement si pas en enregistrement */}
        {!isRecording && !recordingPreview && (
          <>
            <button
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors shadow-md"
              onClick={testMicrophoneAccess}
              title="Tester le microphone"
            >
              <Volume2 size={16} className="text-purple-300" />
            </button>
            <button
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors shadow-md"
              onClick={showSystemInfo}
              title="Informations système"
            >
              <Settings size={16} className="text-purple-300" />
            </button>
          </>
        )}
        
        {/* Bouton d'envoi ou actions d'enregistrement */}
        {recordingPreview ? (
          <>
            <button
              className="p-2 rounded-full bg-red-500 hover:bg-red-600 transition-colors shadow-md"
              onClick={cancelRecording}
              title="Annuler"
            >
              <X size={18} className="text-white" />
            </button>
            <button
              className="p-2 rounded-full bg-green-500 hover:bg-green-600 transition-colors shadow-md"
              onClick={sendRecording}
              title="Envoyer"
            >
              <Send size={18} className="text-white" />
            </button>
          </>
        ) : (
          <button
            onClick={handleSendText}
            disabled={!newMessage.trim() || uploading || isRecording}
            className="p-2 rounded-full bg-gradient-to-br from-purple-600 to-indigo-500 hover:from-purple-700 hover:to-indigo-600 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors shadow-md"
            title="Envoyer"
          >
            <Send size={18} className="text-white" />
          </button>
        )}
      </div>
      
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*,audio/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}

export default function ConversationPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const conversationId = params.conversationId as string;
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [conversationLoading, setConversationLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [showMediaOptions, setShowMediaOptions] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  
  // Nouveaux états pour l'enregistrement vocal amélioré
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingPreview, setRecordingPreview] = useState<string | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  const [recordingInterval, setRecordingInterval] = useState<NodeJS.Timeout | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Vérifier la disponibilité du microphone au chargement
  useEffect(() => {
    const checkMicrophoneAvailability = async () => {
      console.log('🔍 Vérification disponibilité microphone...');
      
      try {
        // Vérifier si l'API est supportée
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          console.warn('⚠️ API MediaDevices non supportée');
          return;
        }

        // Vérifier les permissions
        if (navigator.permissions) {
          try {
            const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
            console.log('🔐 État permission microphone:', permission.state);
            
            if (permission.state === 'granted') {
              console.log('✅ Permission microphone accordée');
            } else if (permission.state === 'denied') {
              console.warn('❌ Permission microphone refusée');
            } else {
              console.log('⏳ Permission microphone en attente');
            }
          } catch (permError) {
            console.warn('⚠️ Impossible de vérifier les permissions:', permError);
          }
        }

        // Lister les périphériques audio
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const audioDevices = devices.filter(device => device.kind === 'audioinput');
          console.log('🎤 Périphériques audio disponibles:', audioDevices.length);
          audioDevices.forEach(device => {
            console.log('  -', device.label || 'Microphone inconnu');
          });
        } catch (enumError) {
          console.warn('⚠️ Impossible de lister les périphériques:', enumError);
        }

      } catch (error) {
        console.error('❌ Erreur vérification microphone:', error);
      }
    };

    checkMicrophoneAvailability();
  }, []);

  // Charger les messages
  useEffect(() => {
    if (session?.user && conversationId) {
      fetchMessages();
      markAsSeen();
    }
  }, [session, conversationId]);

  // Auto-scroll vers le bas
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async () => {
    try {
      console.log('🔄 Chargement des messages pour conversation:', conversationId);
      const response = await fetch(`/api/messages/${conversationId}`);
      const data = await response.json();
      
      console.log('📥 Réponse API:', { status: response.status, data });
      
      if (response.ok) {
        setMessages(data.messages || []);
        console.log('✅ Messages chargés:', data.messages?.length || 0);
        
        // Charger aussi les infos de la conversation
        await fetchConversationInfo();
      } else {
        console.error('❌ Erreur API:', data);
        toast.error(data.error || 'Erreur lors du chargement des messages');
      }
    } catch (error) {
      console.error('❌ Erreur fetch messages:', error);
      toast.error('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  const fetchConversationInfo = async () => {
    try {
      setConversationLoading(true);
      const response = await fetch(`/api/messages/conversations`);
      const data = await response.json();
      
      if (response.ok) {
        const currentConversation = data.conversations.find((conv: any) => conv._id === conversationId);
        if (currentConversation) {
          setConversation(currentConversation);
          console.log('✅ Conversation chargée:', currentConversation);
          console.log('📋 État de la conversation:', {
            id: currentConversation._id,
            accepted: currentConversation.accepted,
            participants: currentConversation.participants
          });
        } else {
          console.log('❌ Conversation non trouvée dans la liste');
        }
      }
    } catch (error) {
      console.error('❌ Erreur chargement conversation:', error);
    } finally {
      setConversationLoading(false);
    }
  };

  const markAsSeen = async () => {
    try {
      await fetch(`/api/messages/${conversationId}/seen`, {
        method: 'POST',
      });
    } catch (error) {
      console.error('Erreur marquage comme lu:', error);
    }
  };

  const sendMessage = async (type: 'text' | 'image' | 'video' | 'audio', content: string, duration?: number) => {
    try {
      const response = await fetch(`/api/messages/${conversationId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, content, duration }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessages(prev => [...prev, data.message]);
        setNewMessage('');
        markAsSeen();
      } else {
        console.error('Erreur envoi message:', data);
        toast.error(data.error || 'Erreur lors de l\'envoi');
      }
    } catch (error) {
      console.error('Erreur envoi message:', error);
      toast.error('Erreur de connexion');
    }
  };

  const handleSendText = () => {
    if (newMessage.trim()) {
      sendMessage('text', newMessage.trim());
    }
  };

  const handleFileUpload = async (file: File, type: 'image' | 'video' | 'audio') => {
    console.log('=== DEBUT HANDLE FILE UPLOAD ===');
    console.log('📁 Fichier:', { name: file.name, type: file.type, size: file.size });
    console.log('🎯 Type demandé:', type);
    
    setUploading(true);
    try {
      // 1. Obtenir la signature d'upload
      const timestamp = Math.round(new Date().getTime() / 1000);
      const publicId = `message_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const requestBody = { timestamp, publicId, type };
      console.log('📤 Envoi requête signature:', requestBody);
      
      const signatureResponse = await fetch('/api/messages/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      console.log('📥 Réponse signature status:', signatureResponse.status);

      if (!signatureResponse.ok) {
        const errorData = await signatureResponse.json();
        console.error('❌ Erreur signature:', errorData);
        throw new Error(errorData.error || 'Erreur lors de la génération de la signature');
      }

      const signatureData = await signatureResponse.json();
      console.log('✅ Signature reçue:', { 
        hasSignature: !!signatureData.signature,
        hasApiKey: !!signatureData.apiKey,
        hasCloudName: !!signatureData.cloudName,
        resourceType: signatureData.resourceType
      });

      const { signature, apiKey, cloudName, resourceType } = signatureData;

      // 2. Upload direct vers Cloudinary
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', `messages/${session?.user?.id}`);
      formData.append('public_id', publicId);
      formData.append('resource_type', resourceType);
      formData.append('timestamp', timestamp.toString());
      formData.append('api_key', apiKey);
      formData.append('signature', signature);

      // Options spécifiques pour vidéo/audio
      if (type === 'video' || type === 'audio') {
        formData.append('duration_limit', '60');
        // Ajouter le format seulement s'il est inclus dans la signature
        if (type === 'audio') {
          formData.append('format', 'mp3');
        }
      }

      console.log('📤 Upload vers Cloudinary...');
      console.log('URL:', `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`);

      const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, {
        method: 'POST',
        body: formData,
      });

      console.log('📥 Réponse Cloudinary status:', uploadResponse.status);

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('❌ Erreur upload Cloudinary:', errorText);
        throw new Error('Erreur lors de l\'upload vers Cloudinary');
      }

      const uploadResult = await uploadResponse.json();
      console.log('✅ Upload Cloudinary réussi:', { 
        public_id: uploadResult.public_id,
        secure_url: uploadResult.secure_url,
        duration: uploadResult.duration
      });
      
      // 3. Envoyer le message avec l'URL uploadée
      console.log('📤 Envoi message avec URL uploadée...');
      sendMessage(type, uploadResult.secure_url, uploadResult.duration);
      
    } catch (error) {
      console.error('❌ Erreur upload fichier:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur lors de l\'upload');
    } finally {
      setUploading(false);
      console.log('=== FIN HANDLE FILE UPLOAD ===');
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Déterminer le type automatiquement en fonction du type MIME
    let type: 'image' | 'video' | 'audio';
    
    if (file.type.startsWith('image/')) {
      type = 'image';
    } else if (file.type.startsWith('video/')) {
      type = 'video';
    } else if (file.type.startsWith('audio/')) {
      type = 'audio';
    } else {
      toast.error('Type de fichier non supporté');
      return;
    }
    
    // Validation de la durée pour vidéo/audio
    if (type === 'video' || type === 'audio') {
      const video = document.createElement('video');
      video.src = URL.createObjectURL(file);
      video.onloadedmetadata = () => {
        if (video.duration > 60) {
          toast.error('Durée maximale dépassée (1 min)');
          return;
        }
        handleFileUpload(file, type);
      };
    } else {
      handleFileUpload(file, type);
    }
  };

  // Fonction pour démarrer le compteur de durée
  const startRecordingTimer = () => {
    const startTime = Date.now();
    setRecordingStartTime(startTime);
    setRecordingDuration(0);
    
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setRecordingDuration(elapsed);
    }, 1000);
    
    setRecordingInterval(interval);
  };

  // Fonction pour arrêter le compteur de durée
  const stopRecordingTimer = () => {
    if (recordingInterval) {
      clearInterval(recordingInterval);
      setRecordingInterval(null);
    }
    setRecordingStartTime(null);
  };

  // Fonction pour jouer la prévisualisation
  const playPreview = () => {
    console.log('🎵 playPreview appelé');
    console.log('📁 recordingPreview:', recordingPreview);
    console.log('🔊 previewAudioRef.current:', previewAudioRef.current);
    
    if (previewAudioRef.current && recordingPreview) {
      previewAudioRef.current.src = recordingPreview;
      previewAudioRef.current.play();
      setIsPreviewPlaying(true);
      
      previewAudioRef.current.onended = () => {
        setIsPreviewPlaying(false);
      };
      console.log('✅ Prévisualisation lancée');
    } else {
      console.warn('⚠️ Impossible de lancer la prévisualisation');
    }
  };

  // Fonction pour arrêter la prévisualisation
  const stopPreview = () => {
    console.log('⏹️ stopPreview appelé');
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.currentTime = 0;
      setIsPreviewPlaying(false);
      console.log('✅ Prévisualisation arrêtée');
    } else {
      console.warn('⚠️ Aucun élément audio à arrêter');
    }
  };

  // Fonction pour envoyer l'enregistrement
  const sendRecording = () => {
    console.log('📤 sendRecording appelé');
    console.log('📁 recordingPreview:', recordingPreview);
    
    if (recordingPreview) {
      console.log('🔄 Création du fichier audio...');
      // Créer un fichier à partir de l'URL de prévisualisation
      fetch(recordingPreview)
        .then(res => res.blob())
        .then(blob => {
          console.log('📦 Blob créé:', blob.size, 'bytes');
          const file = new File([blob], `audio_${Date.now()}.webm`, { type: 'audio/webm' });
          console.log('📁 Fichier créé:', file.name, file.size, 'bytes');
          
          handleFileUpload(file, 'audio');
          
          // Réinitialiser les états
          setRecordingPreview(null);
          setRecordingDuration(0);
          stopPreview();
          console.log('✅ Enregistrement envoyé et états réinitialisés');
        })
        .catch(error => {
          console.error('❌ Erreur lors de l\'envoi de l\'enregistrement:', error);
          toast.error('Erreur lors de l\'envoi de l\'enregistrement');
        });
    } else {
      console.warn('⚠️ Aucun enregistrement à envoyer');
    }
  };

  // Fonction pour annuler l'enregistrement
  const cancelRecording = () => {
    console.log('❌ cancelRecording appelé');
    setRecordingPreview(null);
    setRecordingDuration(0);
    stopPreview();
    stopRecordingTimer();
    console.log('✅ Enregistrement annulé et états réinitialisés');
  };

  // Fonction pour afficher les informations système
  const showSystemInfo = () => {
    const userAgent = navigator.userAgent;
    const platform = navigator.platform;
    const language = navigator.language;
    const cookieEnabled = navigator.cookieEnabled;
    const onLine = navigator.onLine;
    
    console.log('💻 Informations système:');
    console.log('  - User Agent:', userAgent);
    console.log('  - Platform:', platform);
    console.log('  - Language:', language);
    console.log('  - Cookies:', cookieEnabled);
    console.log('  - Online:', onLine);
    console.log('  - HTTPS:', window.location.protocol === 'https:');
    console.log('  - Hostname:', window.location.hostname);
    
    // Détecter le système d'exploitation
    let os = 'Unknown';
    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iOS')) os = 'iOS';
    
    console.log('  - OS:', os);
    
    // Instructions spécifiques au système
    let systemInstructions = '';
    if (os === 'Windows') {
      systemInstructions = `
Paramètres Windows à vérifier :
1. Paramètres > Confidentialité > Microphone
2. Autoriser les applications à accéder au microphone
3. Vérifiez que Chrome a l'autorisation
4. Redémarrez Chrome après modification
      `;
    } else if (os === 'macOS') {
      systemInstructions = `
Paramètres macOS à vérifier :
1. Préférences Système > Sécurité et confidentialité > Microphone
2. Autorisez Chrome dans la liste
3. Redémarrez Chrome après modification
4. Vérifiez aussi les paramètres de confidentialité
      `;
    } else if (os === 'Linux') {
      systemInstructions = `
Paramètres Linux à vérifier :
1. Vérifiez les permissions PulseAudio/ALSA
2. Testez avec : pactl list sources
3. Vérifiez que votre utilisateur est dans le groupe audio
4. Redémarrez Chrome après modification
      `;
    }
    
    console.log('🔧 Instructions système:', systemInstructions);
    
    toast.error(
      `Système détecté: ${os}. ${systemInstructions}`,
      { duration: 20000 }
    );
  };

  // Fonction pour essayer différentes méthodes d'accès au microphone
  const tryMultipleMicrophoneAccess = async () => {
    console.log('🔄 Essai de multiples méthodes d\'accès microphone...');
    
    const methods = [
      {
        name: 'Méthode basique',
        constraints: { audio: true }
      },
      {
        name: 'Méthode sans contraintes',
        constraints: { audio: {} }
      },
      {
        name: 'Méthode avec contraintes minimales',
        constraints: { 
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
          }
        }
      },
      {
        name: 'Méthode avec contraintes avancées',
        constraints: { 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 22050,
            channelCount: 1
          }
        }
      }
    ];

    for (const method of methods) {
      try {
        console.log(`🎤 Essai: ${method.name}`);
        const stream = await navigator.mediaDevices.getUserMedia(method.constraints);
        console.log(`✅ Succès avec ${method.name}`);
        
        // Arrêter le stream de test
        stream.getTracks().forEach(track => track.stop());
        return { success: true, method: method.name };
        
      } catch (error) {
        console.warn(`❌ Échec avec ${method.name}:`, error);
        continue;
      }
    }
    
    console.error('❌ Toutes les méthodes ont échoué');
    return { success: false, method: 'Aucune' };
  };

  // Fonction de test microphone pour diagnostic
  const testMicrophoneAccess = async () => {
    console.log('🧪 Test d\'accès microphone...');
    
    try {
      // Test 1: Vérifier les périphériques
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioDevices = devices.filter(device => device.kind === 'audioinput');
      console.log('🎤 Périphériques audio trouvés:', audioDevices.length);
      
      if (audioDevices.length === 0) {
        console.error('❌ Aucun périphérique audio détecté');
        toast.error('Aucun microphone détecté sur votre appareil');
        return false;
      }
      
      // Test 2: Essayer les méthodes multiples
      const result = await tryMultipleMicrophoneAccess();
      
      if (result.success) {
        console.log('✅ Test microphone réussi avec:', result.method);
        toast.success(`Microphone fonctionne avec ${result.method}`);
        return true;
      } else {
        console.error('❌ Toutes les méthodes d\'accès ont échoué');
        
        // Afficher des instructions spécifiques
        const { browser, instructions } = getBrowserInstructions();
        toast.error(
          `Test échoué: Permission refusée (${browser}). ${instructions}`,
          { duration: 15000 }
        );
        return false;
      }
      
    } catch (error) {
      console.error('❌ Test microphone échoué:', error);
      
      if (error instanceof Error) {
        const errorName = error.name;
        const errorMessage = error.message;
        
        if (errorName === 'NotAllowedError') {
          const { browser, instructions } = getBrowserInstructions();
          toast.error(
            `Test échoué: Permission refusée (${browser}). ${instructions}`,
            { duration: 15000 }
          );
        } else {
          toast.error(`Test microphone échoué: ${errorMessage}`);
        }
      }
      
      return false;
    }
  };

  // Fonction pour détecter le navigateur et afficher des instructions spécifiques
  const getBrowserInstructions = () => {
    const userAgent = navigator.userAgent;
    let browser = 'unknown';
    let instructions = '';

    if (userAgent.includes('Chrome')) {
      browser = 'Chrome';
      instructions = `
1. Cliquez sur l'icône de cadenas 🔒 dans la barre d'adresse
2. Autorisez l'accès au microphone
3. Vérifiez que le site est en HTTPS (pas HTTP)
4. Allez dans chrome://settings/content/microphone
5. Vérifiez que ce site n'est pas bloqué
6. Rafraîchissez la page
7. Si le problème persiste, vérifiez les paramètres système de votre appareil
8. Sur Windows : Paramètres > Confidentialité > Microphone
9. Sur Mac : Préférences Système > Sécurité et confidentialité > Microphone
      `;
    } else if (userAgent.includes('Firefox')) {
      browser = 'Firefox';
      instructions = `
1. Cliquez sur l'icône de cadenas 🔒 dans la barre d'adresse
2. Autorisez l'accès au microphone
3. Rafraîchissez la page
4. Vérifiez aussi les paramètres système
      `;
    } else if (userAgent.includes('Safari')) {
      browser = 'Safari';
      instructions = `
1. Allez dans Préférences > Sites web > Microphone
2. Autorisez l'accès pour ce site
3. Rafraîchissez la page
4. Vérifiez les paramètres système de votre Mac
      `;
    } else if (userAgent.includes('Edge')) {
      browser = 'Edge';
      instructions = `
1. Cliquez sur l'icône de cadenas 🔒 dans la barre d'adresse
2. Autorisez l'accès au microphone
3. Rafraîchissez la page
4. Vérifiez les paramètres système Windows
      `;
    } else {
      instructions = `
1. Vérifiez les permissions microphone dans votre navigateur
2. Autorisez l'accès au microphone pour ce site
3. Vérifiez les paramètres système de votre appareil
4. Rafraîchissez la page après avoir modifié les paramètres
      `;
    }

    return { browser, instructions };
  };

  // Fonction pour forcer la demande de permission microphone
  const requestMicrophonePermission = async () => {
    console.log('🔐 Demande explicite de permission microphone...');
    
    try {
      // Essayer d'abord avec des contraintes minimales
      const basicStream = await navigator.mediaDevices.getUserMedia({ 
        audio: true 
      });
      
      console.log('✅ Permission accordée avec contraintes basiques');
      basicStream.getTracks().forEach(track => track.stop());
      return true;
      
    } catch (basicError) {
      console.warn('⚠️ Échec avec contraintes basiques:', basicError);
      
      try {
        // Essayer avec des contraintes encore plus minimales
        const minimalStream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
          }
        });
        
        console.log('✅ Permission accordée avec contraintes minimales');
        minimalStream.getTracks().forEach(track => track.stop());
        return true;
        
      } catch (minimalError) {
        console.error('❌ Échec même avec contraintes minimales:', minimalError);
        return false;
      }
    }
  };

  const startRecording = async () => {
    console.log('=== DEBUT START RECORDING ===');
    console.log('🎤 Tentative d\'accès au microphone...');
    
    try {
      // Vérifier si l'API MediaDevices est supportée
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('❌ API MediaDevices non supportée');
        toast.error('Enregistrement audio non supporté sur ce navigateur');
        return;
      }

      console.log('✅ API MediaDevices supportée');

      // Vérifier les permissions existantes
      if (navigator.permissions) {
        try {
          const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          console.log('🔐 Permission microphone:', permission.state);
          
          if (permission.state === 'denied') {
            console.error('❌ Permission microphone refusée');
            toast.error('Permission microphone refusée. Veuillez autoriser l\'accès au microphone dans les paramètres du navigateur.');
            return;
          }
        } catch (permError) {
          console.warn('⚠️ Impossible de vérifier les permissions:', permError);
        }
      }

      // Essayer d'abord de demander explicitement la permission
      const hasPermission = await requestMicrophonePermission();
      if (!hasPermission) {
        toast.error('Impossible d\'obtenir l\'accès au microphone. Vérifiez les paramètres de votre navigateur et système.');
        return;
      }

      // Demander l'accès au microphone avec des options spécifiques
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
          channelCount: 1
        }
      };

      console.log('🎤 Demande d\'accès avec contraintes:', constraints);
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('✅ Stream audio obtenu:', stream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled })));

      // Créer le MediaRecorder avec des options spécifiques
      let options: MediaRecorderOptions = {
        audioBitsPerSecond: 128000
      };

      // Vérifier si webm/opus est supporté
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        options.mimeType = 'audio/webm;codecs=opus';
        console.log('✅ WebM/Opus supporté');
      } else {
        console.warn('⚠️ WebM/Opus non supporté, utilisation du format par défaut');
      }

      console.log('🎙️ Création MediaRecorder avec options:', options);
      mediaRecorderRef.current = new MediaRecorder(stream, options);
      audioChunksRef.current = [];

      // Événements du MediaRecorder
      mediaRecorderRef.current.ondataavailable = (event) => {
        console.log('📦 Données audio reçues:', event.data.size, 'bytes');
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstart = () => {
        console.log('🎙️ Enregistrement démarré');
        setIsRecording(true);
        toast.success('Enregistrement en cours...');
        startRecordingTimer(); // Démarrer le compteur de durée
      };

      mediaRecorderRef.current.onstop = async () => {
        console.log('🛑 Enregistrement arrêté, traitement...');
        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          console.log('📁 Blob audio créé:', audioBlob.size, 'bytes');
          
          // Créer une URL de prévisualisation
          const previewUrl = URL.createObjectURL(audioBlob);
          setRecordingPreview(previewUrl);
          
          // Arrêter le stream
          stream.getTracks().forEach(track => {
            track.stop();
            console.log('🔇 Track arrêtée:', track.kind);
          });
          
          // Arrêter le compteur de durée
          stopRecordingTimer();
          
          console.log('✅ Prévisualisation créée');
          toast.success('Enregistrement terminé. Écoutez avant d\'envoyer.');
          
        } catch (error) {
          console.error('❌ Erreur lors du traitement audio:', error);
          toast.error('Erreur lors du traitement de l\'enregistrement');
        }
      };

      mediaRecorderRef.current.onerror = (event) => {
        console.error('❌ Erreur MediaRecorder:', event);
        toast.error('Erreur lors de l\'enregistrement');
        stream.getTracks().forEach(track => track.stop());
      };

      // Démarrer l'enregistrement
      console.log('▶️ Démarrage de l\'enregistrement...');
      mediaRecorderRef.current.start(1000); // Collecter les données toutes les secondes
      
    } catch (error) {
      console.error('❌ Erreur startRecording:', error);
      
      // Messages d'erreur spécifiques selon le type d'erreur
      if (error instanceof Error) {
        const errorName = error.name;
        const errorMessage = error.message;
        
        console.error('Type d\'erreur:', errorName);
        console.error('Message d\'erreur:', errorMessage);
        
        if (errorName === 'NotAllowedError' || errorMessage.includes('Permission')) {
          const { browser, instructions } = getBrowserInstructions();
          console.log(`🔧 Instructions pour ${browser}:`, instructions);
          
          toast.error(
            `Accès microphone refusé (${browser}). ${instructions}`,
            { duration: 8000 }
          );
        } else if (errorName === 'NotFoundError' || errorMessage.includes('not found')) {
          toast.error('Aucun microphone détecté. Veuillez connecter un microphone.');
        } else if (errorName === 'NotReadableError' || errorMessage.includes('busy')) {
          toast.error('Microphone occupé par une autre application.');
        } else if (errorName === 'NotSupportedError') {
          toast.error('Enregistrement audio non supporté sur ce navigateur.');
        } else {
          toast.error(`Erreur d'accès au microphone: ${errorMessage}`);
        }
      } else {
        toast.error('Erreur d\'accès au microphone');
      }
    } finally {
      console.log('=== FIN START RECORDING ===');
    }
  };

  const stopRecording = () => {
    console.log('=== DEBUT STOP RECORDING ===');
    
    if (mediaRecorderRef.current && isRecording) {
      try {
        console.log('🛑 Arrêt de l\'enregistrement...');
        
        // Arrêter l'enregistrement
        if (mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
          console.log('✅ MediaRecorder arrêté');
        } else {
          console.warn('⚠️ MediaRecorder déjà arrêté, état:', mediaRecorderRef.current.state);
        }
        
        // Arrêter le stream audio
        if (mediaRecorderRef.current.stream) {
          mediaRecorderRef.current.stream.getTracks().forEach(track => {
            track.stop();
            console.log('🔇 Track audio arrêtée:', track.kind);
          });
        }
        
        setIsRecording(false);
        console.log('✅ État recording mis à false');
        
      } catch (error) {
        console.error('❌ Erreur lors de l\'arrêt de l\'enregistrement:', error);
        toast.error('Erreur lors de l\'arrêt de l\'enregistrement');
        setIsRecording(false);
      }
    } else {
      console.log('ℹ️ Pas d\'enregistrement en cours à arrêter');
    }
    
    console.log('=== FIN STOP RECORDING ===');
  };

  const playAudio = (audioUrl: string, messageId: string) => {
    if (playingAudio === messageId) {
      setPlayingAudio(null);
    } else {
      setPlayingAudio(messageId);
      const audio = new Audio(audioUrl);
      audio.onended = () => setPlayingAudio(null);
      audio.play();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getOtherParticipant = () => {
    if (!conversation || !session?.user?.id) return null;
    return conversation.participants.find(p => p._id !== session.user.id);
  };

  if (!session?.user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-600">Connectez-vous pour accéder aux messages</h2>
        </div>
      </div>
    );
  }

  const otherUser = getOtherParticipant();

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-black via-neutral-900 to-black">
      {/* Élément audio caché pour la prévisualisation */}
      <audio ref={previewAudioRef} className="hidden" />
      
      {/* Header fixed */}
      <div className="fixed top-0 left-0 w-full z-30 flex items-center justify-between p-4 bg-white/10 backdrop-blur-md border-b border-white/20 rounded-b-2xl shadow-lg">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors shadow-md"
          >
            <ArrowLeft size={20} className="text-white" />
          </button>
          {otherUser ? (
            <div className="flex items-center space-x-3">
              <img
                src={otherUser.avatar || '/default-avatar.png'}
                alt={otherUser.name}
                className="w-12 h-12 rounded-full object-cover border-2 border-purple-400 shadow-md"
              />
              <div>
                <h2 className="font-semibold text-white text-lg leading-tight">{otherUser.name}</h2>
                <p className="text-xs text-purple-200 font-mono">@{otherUser.username}</p>
              </div>
            </div>
          ) : conversationLoading ? (
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gray-600 rounded-full animate-pulse"></div>
              <div>
                <div className="h-4 bg-gray-600 rounded w-24 animate-pulse"></div>
                <div className="h-3 bg-gray-700 rounded w-16 mt-1 animate-pulse"></div>
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gray-600 rounded-full"></div>
              <div>
                <h2 className="font-semibold text-white">Utilisateur</h2>
                <p className="text-xs text-purple-200">Chargement...</p>
              </div>
            </div>
          )}
        </div>
        <button className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors shadow-md">
          <MoreVertical size={20} className="text-white" />
        </button>
      </div>

      {/* Messages scrollable avec padding pour header et BottomNav+input */}
      <div className="pt-20 pb-32 px-2 flex flex-col space-y-4 overflow-y-auto h-screen">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        ) : (
          <AnimatePresence>
            {messages.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <p>Aucun message pour cette conversation. Commencez une discussion !</p>
              </div>
            ) : (
              messages.map((message) => (
                <motion.div
                  key={message._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${message.sender._id === session.user?.id ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl shadow-xl backdrop-blur-md transition-all
                      ${message.sender._id === session.user?.id
                        ? 'bg-gradient-to-br from-purple-600 via-purple-500 to-indigo-500 text-white border-2 border-purple-400'
                        : 'bg-white/10 text-white border border-white/20'}
                    `}
                    style={{ wordBreak: 'break-word' }}
                  >
                    {/* Message content */}
                    {message.type === 'text' && (
                      <p className="text-base leading-relaxed">{message.content}</p>
                    )}
                    {message.type === 'image' && (
                      <div className="mt-2 rounded-xl overflow-hidden shadow-lg border-2 border-purple-300">
                        <img src={message.content} alt="Image envoyée" className="w-64 h-64 object-cover" />
                      </div>
                    )}
                    {message.type === 'video' && (
                      <div className="mt-2 rounded-xl overflow-hidden shadow-lg border-2 border-purple-300">
                        <video src={message.content} controls className="w-64 h-64 object-cover" />
                      </div>
                    )}
                    {message.type === 'audio' && (
                      <div className="mt-2 flex items-center space-x-2">
                        <button
                          onClick={() => playAudio(message.content, message._id)}
                          className="p-2 rounded-full bg-purple-500 hover:bg-purple-600 shadow-md"
                        >
                          {playingAudio === message._id ? <Pause size={20} /> : <Play size={20} />}
                        </button>
                        <span className="text-xs text-white/70 font-mono">
                          {message.duration ? formatTime(message.duration) : 'Audio'}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-end mt-1">
                      <span className="text-[10px] text-purple-200 font-mono">
                        {formatMessageTime(message.createdAt)}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Barre d’envoi indépendante, juste au-dessus de la BottomNav */}
      {/* Barre d'envoi améliorée avec enregistrement vocal intégré */}
      <MessageInputBar
        newMessage={newMessage}
        setNewMessage={setNewMessage}
        handleSendText={handleSendText}
        handleFileSelect={handleFileSelect}
        fileInputRef={fileInputRef}
        isRecording={isRecording}
        startRecording={startRecording}
        stopRecording={stopRecording}
        uploading={uploading}
        testMicrophoneAccess={testMicrophoneAccess}
        showSystemInfo={showSystemInfo}
        recordingPreview={recordingPreview}
        recordingDuration={recordingDuration}
        isPreviewPlaying={isPreviewPlaying}
        playPreview={playPreview}
        stopPreview={stopPreview}
        sendRecording={sendRecording}
        cancelRecording={cancelRecording}
      />
    </div>
  );
} 