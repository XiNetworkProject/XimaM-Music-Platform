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
  Paperclip
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

function MessageInputBar({
  newMessage,
  setNewMessage,
  handleSendText,
  handleFileSelect,
  fileInputRef,
  isRecording,
  startRecording,
  stopRecording,
  uploading
}: any) {
  return (
    <div className="fixed bottom-16 left-0 w-full z-40 px-0 py-2 bg-white/10 backdrop-blur-md border-t border-white/20 flex items-center gap-1 rounded-t-2xl shadow-2xl">
      <button
        className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors shadow-md"
        onClick={() => fileInputRef.current?.click()}
        title="Envoyer un média"
      >
        <Paperclip size={20} className="text-purple-300" />
      </button>
      <button
        className={`p-2 rounded-full transition-colors shadow-md ${isRecording ? 'bg-red-500' : 'bg-white/20 hover:bg-white/30'}`}
        onMouseDown={startRecording}
        onMouseUp={stopRecording}
        onMouseLeave={stopRecording}
        onTouchStart={startRecording}
        onTouchEnd={stopRecording}
        title="Message vocal"
      >
        <Mic size={20} className="text-purple-300" />
      </button>
      <input
        type="text"
        value={newMessage}
        onChange={(e) => setNewMessage(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && handleSendText()}
        placeholder="Tapez votre message..."
        className="flex-1 px-3 py-2 bg-white/20 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-md"
        disabled={uploading}
      />
      <button
        onClick={handleSendText}
        disabled={!newMessage.trim() || uploading}
        className="p-2 rounded-full bg-gradient-to-br from-purple-600 to-indigo-500 hover:from-purple-700 hover:to-indigo-600 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors shadow-md"
        title="Envoyer"
      >
        <Send size={20} className="text-white" />
      </button>
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
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

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
        formData.append('format', type === 'video' ? 'mp4' : 'mp3');
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
      };

      mediaRecorderRef.current.onstop = async () => {
        console.log('🛑 Enregistrement arrêté, traitement...');
        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          console.log('📁 Blob audio créé:', audioBlob.size, 'bytes');
          
          const file = new File([audioBlob], `audio_${Date.now()}.webm`, { type: 'audio/webm' });
          console.log('📄 Fichier audio créé:', file.name, file.size, 'bytes');
          
          // Arrêter le stream
          stream.getTracks().forEach(track => {
            track.stop();
            console.log('🔇 Track arrêtée:', track.kind);
          });
          
          console.log('📤 Upload du fichier audio...');
          handleFileUpload(file, 'audio');
          
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
          toast.error('Accès au microphone refusé. Veuillez autoriser l\'accès dans les paramètres du navigateur.');
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
      />
    </div>
  );
} 