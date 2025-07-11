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
  Settings,
  Heart,
  Smile,
  Camera,
  Phone,
  Video as VideoIcon,
  MessageCircle,
  User,
  Eye,
  EyeOff,
  Wifi,
  WifiOff,
  Activity
} from 'lucide-react';
import toast from 'react-hot-toast';
import React from 'react';
import { useWebSocket, NewMessage, TypingStatus } from '@/hooks/useWebSocket';

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

interface OnlineStatus {
  userId: string;
  isOnline: boolean;
  lastSeen: Date;
  isTyping: boolean;
}

// Hook personnalisé pour la gestion de la présence en ligne avec WebSocket
const useOnlineStatus = (conversationId: string, otherUserId: string) => {
  const { socket, isConnected, joinConversation, leaveConversation, onUserTyping, onUserOnline, onUserOffline } = useWebSocket();
  const [onlineStatus, setOnlineStatus] = useState<OnlineStatus>({
    userId: otherUserId,
    isOnline: false,
    lastSeen: new Date(),
    isTyping: false
  });

  // Fonction pour formater le lastSeen de manière plus intelligente
  const formatLastSeen = useCallback((lastSeen: Date) => {
    const now = new Date();
    const timeDiff = now.getTime() - lastSeen.getTime();
    const minutesDiff = timeDiff / (1000 * 60);
    const hoursDiff = minutesDiff / 60;
    const daysDiff = hoursDiff / 24;

    if (minutesDiff < 1) return 'À l\'instant';
    if (minutesDiff < 60) return `Il y a ${Math.floor(minutesDiff)} min`;
    if (hoursDiff < 24) return `Il y a ${Math.floor(hoursDiff)}h`;
    if (daysDiff < 7) return `Il y a ${Math.floor(daysDiff)}j`;
    return `Il y a ${Math.floor(daysDiff)}j`;
  }, []);

  // Rejoindre la conversation au montage
  useEffect(() => {
    if (conversationId) {
      joinConversation(conversationId);
    }

    return () => {
      if (conversationId) {
        leaveConversation(conversationId);
      }
    };
  }, [conversationId, joinConversation, leaveConversation]);

  // Écouter les événements de frappe
  useEffect(() => {
    const handleUserTyping = (data: TypingStatus) => {
      if (data.userId === otherUserId && data.conversationId === conversationId) {
        setOnlineStatus(prev => ({
          ...prev,
          isTyping: data.isTyping
        }));
      }
    };

    onUserTyping(handleUserTyping);
  }, [otherUserId, conversationId, onUserTyping]);

  // Écouter les changements de statut en ligne
  useEffect(() => {
    const handleUserOnline = (data: { userId: string; isOnline: boolean }) => {
      if (data.userId === otherUserId) {
        setOnlineStatus(prev => ({
          ...prev,
          isOnline: data.isOnline
        }));
      }
    };

    const handleUserOffline = (data: { userId: string; isOnline: boolean }) => {
      if (data.userId === otherUserId) {
        setOnlineStatus(prev => ({
          ...prev,
          isOnline: data.isOnline
        }));
      }
    };

    onUserOnline(handleUserOnline);
    onUserOffline(handleUserOffline);
  }, [otherUserId, onUserOnline, onUserOffline]);

  // Fonction pour envoyer le statut de frappe
  const sendTypingStatus = useCallback((isTyping: boolean) => {
    // Cette fonction sera gérée par le hook useWebSocket
  }, []);

  return {
    onlineStatus,
    isConnected,
    sendTypingStatus,
    formatLastSeen
  };
};

// Hook personnalisé pour la gestion du statut de lecture
const useMessageReadStatus = (conversationId: string, currentUserId: string) => {
  const [readStatuses, setReadStatuses] = useState<Map<string, string[]>>(new Map());
  const [isMarkingAsRead, setIsMarkingAsRead] = useState(false);

  // Marquer les messages comme lus
  const markMessagesAsRead = useCallback(async (messageIds: string[]) => {
    if (isMarkingAsRead || messageIds.length === 0 || !currentUserId) return;

    setIsMarkingAsRead(true);
    try {
      const response = await fetch(`/api/messages/${conversationId}/seen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageIds })
      });

      if (response.ok) {
        console.log('✅ Messages marqués comme lus');
        // Mettre à jour le statut local
        setReadStatuses(prev => {
          const newStatuses = new Map(prev);
          messageIds.forEach(id => {
            const currentSeenBy = newStatuses.get(id) || [];
            if (!currentSeenBy.includes(currentUserId)) {
              newStatuses.set(id, [...currentSeenBy, currentUserId]);
            }
          });
          return newStatuses;
        });
      }
    } catch (error) {
      console.error('❌ Erreur marquage comme lu:', error);
    } finally {
      setIsMarkingAsRead(false);
    }
  }, [conversationId, isMarkingAsRead, currentUserId]);

  // Observer les messages pour marquer comme lus
  const observeMessages = useCallback((messages: Message[]) => {
    if (!currentUserId) return;
    
    const unreadMessages = messages.filter(msg => 
      msg.sender._id !== currentUserId && 
      !msg.seenBy.includes(currentUserId)
    );

    if (unreadMessages.length > 0) {
      const messageIds = unreadMessages.map(msg => msg._id);
      markMessagesAsRead(messageIds);
    }
  }, [markMessagesAsRead, currentUserId]);

  return {
    readStatuses,
    observeMessages,
    markMessagesAsRead
  };
};

// Composant d'animation de visualisation audio amélioré
const AudioVisualizer = ({ isPlaying, duration }: { isPlaying: boolean; duration: number }) => {
  const [currentTime, setCurrentTime] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fonction locale pour formater le temps
  const formatTimeLocal = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (isPlaying) {
      setCurrentTime(0);
      intervalRef.current = setInterval(() => {
        setCurrentTime(prev => {
          if (prev >= duration) {
            return duration;
          }
          return prev + 0.05;
        });
      }, 50);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setCurrentTime(0);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, duration]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <motion.div 
      className="flex items-center space-x-3"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Barres de visualisation animées améliorées */}
      <div className="flex items-end space-x-1 h-8">
        {[...Array(8)].map((_, index) => (
          <motion.div
            key={index}
            className="w-1 bg-gradient-to-t from-purple-400 via-pink-400 to-indigo-400 rounded-full"
            animate={{
              height: isPlaying 
                ? [4, 16, 8, 24, 12, 32, 6, 28][index % 8] 
                : 4
            }}
            transition={{
              duration: 0.5,
              repeat: isPlaying ? Infinity : 0,
              repeatType: "reverse",
              delay: index * 0.1,
              ease: "easeInOut"
            }}
            style={{
              height: isPlaying ? undefined : '4px'
            }}
          />
        ))}
      </div>
      
      {/* Barre de progression avec temps */}
      <div className="flex-1">
        <div className="w-full bg-white/10 rounded-full h-2 mb-2">
          <motion.div 
            className="bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 h-2 rounded-full shadow-lg"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>
        <div className="flex justify-between text-xs text-white/70">
          <span>{formatTimeLocal(currentTime)}</span>
          <span>{formatTimeLocal(duration)}</span>
        </div>
      </div>
    </motion.div>
  );
};

// Composant pour les indicateurs de statut des messages amélioré
const MessageStatus = ({ message, isOwnMessage, readStatuses, currentUserId }: { 
  message: Message; 
  isOwnMessage: boolean;
  readStatuses: Map<string, string[]>;
  currentUserId: string;
}) => {
  if (!isOwnMessage) return null;

  // Utiliser les données du message ou les statuts locaux
  const messageReadStatus = readStatuses.get(message._id) || message.seenBy;
  
  // Compter uniquement les autres utilisateurs qui ont vu le message (exclure l'expéditeur)
  const otherViewers = messageReadStatus.filter(id => id !== message.sender._id);
  const isSeen = otherViewers.length > 0;
  const seenCount = otherViewers.length;

  return (
    <motion.div 
      className="flex items-center space-x-2 mt-2"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.3 }}
    >
      {isSeen ? (
        <div className="flex items-center space-x-1">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5 }}
          >
            <Eye size={12} className="text-blue-400" />
          </motion.div>
          <span className="text-xs text-blue-400 font-medium">
            Vu{seenCount > 1 ? ` (${seenCount})` : ''}
          </span>
        </div>
      ) : (
        <div className="flex items-center space-x-1">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5 }}
          >
            <Check size={12} className="text-white/50" />
          </motion.div>
          <span className="text-xs text-white/50">Envoyé</span>
        </div>
      )}
    </motion.div>
  );
};

// Composant pour afficher le statut en ligne avec plus de détails
const OnlineStatusIndicator = ({ onlineStatus, isConnected, formatLastSeen }: { 
  onlineStatus: OnlineStatus; 
  isConnected: boolean;
  formatLastSeen: (date: Date) => string;
}) => {

  return (
    <motion.div 
      className="flex items-center space-x-2"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3 }}
    >
      {onlineStatus.isOnline ? (
        <div className="flex items-center space-x-2">
          <motion.div
            className="w-2 h-2 bg-green-500 rounded-full"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <span className="text-xs text-green-400 font-medium">En ligne</span>
          {onlineStatus.isTyping && (
            <motion.div
              className="flex items-center space-x-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Activity size={12} className="text-purple-400 animate-pulse" />
              <span className="text-xs text-purple-400">écrit...</span>
            </motion.div>
          )}
        </div>
      ) : (
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-gray-400 rounded-full" />
          <span className="text-xs text-gray-400">
            Vu {formatLastSeen(onlineStatus.lastSeen)}
          </span>
        </div>
      )}
      
      {/* Indicateur de connexion WebSocket */}
      <motion.div
        className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.5 }}
      />
    </motion.div>
  );
};

// Composant pour l'avatar avec statut en ligne amélioré
const UserAvatar = ({ user, onlineStatus, isConnected }: { 
  user: any; 
  onlineStatus: OnlineStatus;
  isConnected: boolean;
}) => (
  <div className="relative">
    <motion.img
      src={user.avatar || '/default-avatar.png'}
      alt={user.name}
      className="w-12 h-12 rounded-full object-cover border-2 border-purple-400 shadow-lg"
      whileHover={{ scale: 1.05 }}
      transition={{ duration: 0.2 }}
    />
    
    {/* Indicateur de statut en ligne */}
    {onlineStatus.isOnline && (
      <motion.div
        className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-lg"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.3 }}
      />
    )}
    
    {/* Indicateur de frappe */}
    {onlineStatus.isTyping && (
      <motion.div
        className="absolute -top-1 -left-1 w-6 h-6 bg-purple-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0 }}
      >
        <Activity size={10} className="text-white animate-pulse" />
      </motion.div>
    )}
    
    {/* Indicateur de connexion WebSocket */}
    <motion.div
      className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
        isConnected ? 'bg-green-500' : 'bg-red-500'
      }`}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ delay: 0.5 }}
    />
  </div>
);

// Fonction pour formater la durée d'enregistrement
const formatRecordingDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Composant de la barre d'envoi améliorée
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
  cancelRecording,
  handleTyping
}: any) {
  return (
    <motion.div 
      className="fixed bottom-16 left-0 w-full z-40 px-3 py-3 bg-gradient-to-r from-purple-900/80 via-indigo-900/80 to-purple-900/80 backdrop-blur-xl border-t border-purple-400/30 rounded-t-3xl shadow-2xl"
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className="flex items-center gap-3">
        {/* Bouton pièce jointe avec animation */}
        <motion.button
          className="p-3 rounded-full bg-gradient-to-br from-purple-500/20 to-indigo-500/20 hover:from-purple-500/30 hover:to-indigo-500/30 transition-all duration-300 shadow-lg border border-purple-400/30 flex-shrink-0"
          onClick={() => fileInputRef.current?.click()}
          title="Envoyer un média"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Paperclip size={18} className="text-purple-300" />
        </motion.button>
        
        {/* Bouton microphone ou prévisualisation amélioré */}
        {!recordingPreview ? (
          <motion.button
            className={`p-3 rounded-full transition-all duration-300 shadow-lg flex-shrink-0 relative ${
              isRecording 
                ? 'bg-gradient-to-br from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 scale-110 shadow-red-500/50' 
                : 'bg-gradient-to-br from-purple-500/20 to-indigo-500/20 hover:from-purple-500/30 hover:to-indigo-500/30 border border-purple-400/30'
            }`}
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onMouseLeave={stopRecording}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            title={isRecording ? 'Relâchez pour arrêter' : 'Maintenez pour enregistrer'}
            whileHover={{ scale: isRecording ? 1.1 : 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Mic size={18} className={`transition-colors ${isRecording ? 'text-white' : 'text-purple-300'}`} />
            {/* Animation d'enregistrement améliorée */}
            {isRecording && (
              <motion.div 
                className="absolute -top-1 -right-1 flex space-x-0.5"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '0s' }}></div>
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
              </motion.div>
            )}
          </motion.button>
        ) : (
          // Interface de prévisualisation améliorée
          <motion.div 
            className="flex items-center space-x-3 bg-gradient-to-r from-purple-600/40 to-indigo-600/40 rounded-xl px-4 py-3 flex-shrink-0 border border-purple-400/40"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <motion.button
              className={`p-2 rounded-full transition-all duration-200 ${
                isPreviewPlaying 
                  ? 'bg-gradient-to-br from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 scale-110' 
                  : 'bg-gradient-to-br from-purple-500/20 to-indigo-500/20 hover:from-purple-500/30 hover:to-indigo-500/30'
              }`}
              onClick={isPreviewPlaying ? stopPreview : playPreview}
              title={isPreviewPlaying ? 'Arrêter' : 'Écouter'}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isPreviewPlaying ? <Pause size={16} /> : <Play size={16} />}
            </motion.button>
            <div className="flex flex-col">
              <span className="text-white font-mono text-sm">
                {formatRecordingDuration(recordingDuration)}
              </span>
              <span className="text-white/60 text-xs">
                Prévisualisation
              </span>
            </div>
          </motion.div>
        )}
        
        {/* Zone de saisie de texte améliorée */}
        <motion.input
          type="text"
          value={newMessage}
          onChange={(e) => {
            setNewMessage(e.target.value);
            handleTyping(); // Déclencher le statut de frappe
          }}
          onKeyPress={(e) => e.key === 'Enter' && handleSendText()}
          placeholder="Tapez votre message..."
          className="flex-1 min-w-0 px-4 py-3 bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-sm border border-purple-400/30 rounded-2xl text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-400 shadow-lg text-sm"
          disabled={uploading || isRecording}
          whileFocus={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
        />
        
        {/* Boutons d'action améliorés */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Boutons de diagnostic - seulement si pas en enregistrement */}
          {!isRecording && !recordingPreview && (
            <AnimatePresence>
              <motion.button
                className="p-3 rounded-full bg-gradient-to-br from-purple-500/20 to-indigo-500/20 hover:from-purple-500/30 hover:to-indigo-500/30 transition-all duration-300 shadow-lg border border-purple-400/30"
                onClick={testMicrophoneAccess}
                title="Tester le microphone"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
              >
                <Volume2 size={16} className="text-purple-300" />
              </motion.button>
            </AnimatePresence>
          )}
          
          {/* Bouton d'envoi ou actions d'enregistrement */}
          {recordingPreview ? (
            <AnimatePresence>
              <motion.button
                className="p-3 rounded-full bg-gradient-to-br from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 transition-all duration-300 shadow-lg"
                onClick={cancelRecording}
                title="Annuler"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
              >
                <X size={18} className="text-white" />
              </motion.button>
              <motion.button
                className="p-3 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 transition-all duration-300 shadow-lg"
                onClick={sendRecording}
                title="Envoyer"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
              >
                <Send size={18} className="text-white" />
              </motion.button>
            </AnimatePresence>
          ) : (
            <motion.button
              onClick={handleSendText}
              disabled={!newMessage.trim() || uploading || isRecording}
              className="p-3 rounded-full bg-gradient-to-br from-purple-600 to-indigo-500 hover:from-purple-700 hover:to-indigo-600 disabled:bg-gray-500 disabled:cursor-not-allowed transition-all duration-300 shadow-lg"
              title="Envoyer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Send size={18} className="text-white" />
            </motion.button>
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
    </motion.div>
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
      // Ne marquer comme lu que si on a des messages non lus
      if (!session?.user?.id) return;
      
      const unreadMessages = messages.filter(msg => 
        msg.sender._id !== session.user.id && 
        !msg.seenBy.includes(session.user.id)
      );

      if (unreadMessages.length > 0) {
        console.log('📖 Marquage comme lu de', unreadMessages.length, 'messages');
        await fetch(`/api/messages/${conversationId}/seen`, {
          method: 'POST',
        });
      }
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
        console.log('✅ Message envoyé:', data.message);
        
        // Ajouter le message à la liste locale
        setMessages(prev => [...prev, data.message]);
        setNewMessage('');
        markAsSeen();
        
        // Envoyer via WebSocket pour les autres participants
        wsSendNewMessage(data.message);
        
        // Arrêter la frappe
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        setIsTyping(false);
        wsSendTypingStatus(conversationId, false);
        
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

      // Timeout plus long pour mobile
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 secondes

      let uploadResponse;
      try {
        uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        console.log('📥 Réponse Cloudinary status:', uploadResponse.status);

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          console.error('❌ Erreur upload Cloudinary:', errorText);
          
          // Messages d'erreur spécifiques
          if (uploadResponse.status === 413) {
            throw new Error('Fichier trop volumineux pour l\'upload');
          } else if (uploadResponse.status === 400) {
            throw new Error('Format de fichier non supporté');
          } else if (uploadResponse.status >= 500) {
            throw new Error('Erreur serveur Cloudinary, réessayez plus tard');
          } else {
            throw new Error('Erreur lors de l\'upload vers Cloudinary');
          }
        }
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error('Timeout lors de l\'upload (connexion lente)');
        }
        throw error;
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
    console.log('⏱️ startRecordingTimer appelé');
    // Arrêter l'ancien timer s'il existe
    if (recordingInterval) {
      clearInterval(recordingInterval);
      setRecordingInterval(null);
    }
    
    const startTime = Date.now();
    setRecordingStartTime(startTime);
    setRecordingDuration(0);
    
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setRecordingDuration(elapsed);
    }, 1000);
    
    setRecordingInterval(interval);
    console.log('✅ Timer démarré');
  };

  // Fonction pour arrêter le compteur de durée
  const stopRecordingTimer = () => {
    console.log('⏹️ stopRecordingTimer appelé');
    if (recordingInterval) {
      clearInterval(recordingInterval);
      setRecordingInterval(null);
      console.log('✅ Timer arrêté');
    } else {
      console.log('ℹ️ Aucun timer à arrêter');
    }
    setRecordingStartTime(null);
    setRecordingDuration(0);
  };

  // Fonction pour jouer la prévisualisation
  const playPreview = () => {
    console.log('🎵 playPreview appelé');
    console.log('📁 recordingPreview:', recordingPreview);
    console.log('🔊 previewAudioRef.current:', previewAudioRef.current);
    
    if (previewAudioRef.current && recordingPreview) {
      try {
        previewAudioRef.current.src = recordingPreview;
        
        // Gestion spéciale pour mobile
        const playPromise = previewAudioRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setIsPreviewPlaying(true);
              console.log('✅ Prévisualisation lancée');
            })
            .catch(error => {
              console.error('❌ Erreur lecture prévisualisation:', error);
              toast.error('Erreur lors de la lecture de la prévisualisation');
            });
        }
        
        previewAudioRef.current.onended = () => {
          setIsPreviewPlaying(false);
        };
        
        previewAudioRef.current.onerror = (error) => {
          console.error('❌ Erreur audio:', error);
          setIsPreviewPlaying(false);
        };
        
      } catch (error) {
        console.error('❌ Erreur lors de la lecture:', error);
        toast.error('Erreur lors de la lecture de la prévisualisation');
      }
    } else {
      console.warn('⚠️ Impossible de lancer la prévisualisation');
      toast.error('Aucun enregistrement à écouter');
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
        console.log('📦 Type MIME:', event.data.type);
        console.log('📦 Taille du chunk:', event.data.size, 'bytes');
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
        console.log('📦 Nombre de chunks audio:', audioChunksRef.current.length);
        console.log('📦 Taille totale des chunks:', audioChunksRef.current.reduce((total, chunk) => total + chunk.size, 0), 'bytes');
        
        try {
          if (audioChunksRef.current.length === 0) {
            console.warn('⚠️ Aucune donnée audio enregistrée');
            toast.error('Aucun son détecté. Vérifiez votre microphone.');
            return;
          }
          
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          console.log('📁 Blob audio créé:', audioBlob.size, 'bytes');
          
          if (audioBlob.size === 0) {
            console.warn('⚠️ Blob audio vide');
            toast.error('Enregistrement vide. Vérifiez votre microphone.');
            return;
          }
          
          // Créer une URL de prévisualisation
          const previewUrl = URL.createObjectURL(audioBlob);
          setRecordingPreview(previewUrl);
          
          // Test de lecture de l'audio enregistré
          const testAudio = new Audio(previewUrl);
          testAudio.onloadedmetadata = () => {
            console.log('🎵 Audio test - Durée:', testAudio.duration, 'secondes');
            console.log('🎵 Audio test - Taille:', audioBlob.size, 'bytes');
            
            // Test de lecture
            testAudio.play().then(() => {
              console.log('✅ Audio test - Lecture réussie');
            }).catch(error => {
              console.error('❌ Audio test - Erreur lecture:', error);
            });
          };
          
          testAudio.onerror = (error) => {
            console.error('❌ Audio test - Erreur chargement:', error);
          };
          
          // Arrêter le stream
          stream.getTracks().forEach(track => {
            track.stop();
            console.log('🔇 Track arrêtée:', track.kind);
          });
          
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
      
      // Vérifier que l'enregistrement a bien démarré
      setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          console.log('✅ Enregistrement confirmé en cours');
        } else {
          console.warn('⚠️ Enregistrement non démarré, état:', mediaRecorderRef.current?.state);
        }
      }, 100);
      
      // Test de niveau audio pour diagnostiquer
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      microphone.connect(analyser);
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const checkAudioLevel = () => {
        if (isRecording) {
          analyser.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          console.log('🎵 Niveau audio moyen:', average);
          
          if (average > 10) {
            console.log('✅ Son détecté par le microphone');
          } else {
            console.log('🔇 Aucun son détecté par le microphone');
          }
          
          setTimeout(checkAudioLevel, 1000);
        }
      };
      
      setTimeout(checkAudioLevel, 500);
      
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
        
        // IMPORTANT: Arrêter le timer
        stopRecordingTimer();
        console.log('⏹️ Timer arrêté après enregistrement');
        
      } catch (error) {
        console.error('❌ Erreur lors de l\'arrêt de l\'enregistrement:', error);
        toast.error('Erreur lors de l\'arrêt de l\'enregistrement');
        setIsRecording(false);
        stopRecordingTimer(); // Arrêter le timer même en cas d'erreur
      }
    } else {
      console.log('ℹ️ Pas d\'enregistrement en cours à arrêter');
      // Arrêter le timer même si pas d'enregistrement en cours
      stopRecordingTimer();
    }
    
    console.log('=== FIN STOP RECORDING ===');
  };

  // Référence pour l'audio en cours de lecture
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  const playAudio = (audioUrl: string, messageId: string) => {
    console.log('🎵 playAudio appelé pour:', messageId);
    
    // Si on clique sur le même message qui est en cours de lecture
    if (playingAudio === messageId) {
      console.log('⏸️ Pause de l\'audio en cours');
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
      }
      setPlayingAudio(null);
      currentAudioRef.current = null;
      return;
    }
    
    // Arrêter l'audio précédent s'il y en a un
    if (currentAudioRef.current) {
      console.log('🛑 Arrêt de l\'audio précédent');
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
    }
    
    // Créer un nouvel élément audio
    const audio = new Audio(audioUrl);
    currentAudioRef.current = audio;
    setPlayingAudio(messageId);
    
    // Gestion des événements audio
    audio.onended = () => {
      console.log('✅ Audio terminé');
      setPlayingAudio(null);
      currentAudioRef.current = null;
    };
    
    audio.onerror = (error) => {
      console.error('❌ Erreur lecture audio:', error);
      setPlayingAudio(null);
      currentAudioRef.current = null;
      toast.error('Erreur lors de la lecture de l\'audio');
    };
    
    // Démarrer la lecture
    audio.play().then(() => {
      console.log('✅ Lecture audio démarrée');
    }).catch(error => {
      console.error('❌ Erreur démarrage lecture:', error);
      setPlayingAudio(null);
      currentAudioRef.current = null;
      toast.error('Erreur lors de la lecture de l\'audio');
    });
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
  const { onlineStatus, isConnected, sendTypingStatus, formatLastSeen } = useOnlineStatus(conversationId, otherUser?._id || '');
  const { readStatuses, observeMessages, markMessagesAsRead } = useMessageReadStatus(conversationId, session?.user?.id || '');
  
  // WebSocket hooks
  const { 
    socket, 
    isConnected: wsConnected, 
    sendTypingStatus: wsSendTypingStatus, 
    sendNewMessage: wsSendNewMessage,
    sendMessageSeen: wsSendMessageSeen,
    onMessageReceived,
    onUserTyping
  } = useWebSocket();

  // Observer les messages pour marquer comme lus
  useEffect(() => {
    if (messages.length > 0 && session?.user?.id) {
      observeMessages(messages);
    }
  }, [messages, observeMessages, session?.user?.id]);

  // Écouter les nouveaux messages en temps réel
  useEffect(() => {
    const handleMessageReceived = (message: NewMessage) => {
      console.log('📨 Nouveau message reçu en temps réel:', message);
      
      // Ajouter le nouveau message à la liste
      setMessages(prev => [...prev, message]);
      
      // Marquer comme lu automatiquement
      if (session?.user?.id && !message.seenBy.includes(session.user.id)) {
        wsSendMessageSeen(message._id, conversationId, [...message.seenBy, session.user.id]);
      }
    };

    onMessageReceived(handleMessageReceived);
  }, [onMessageReceived, conversationId, session?.user?.id, wsSendMessageSeen]);

  // Écouter les changements de statut de frappe
  useEffect(() => {
    const handleUserTyping = (data: TypingStatus) => {
      if (data.userId === otherUser?._id && data.conversationId === conversationId) {
        console.log('⌨️ Frappe détectée:', data);
        // Le statut de frappe est déjà géré par le hook useOnlineStatus
      }
    };

    onUserTyping(handleUserTyping);
  }, [onUserTyping, otherUser?._id, conversationId]);

  // Gérer le statut de frappe
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleTyping = useCallback(() => {
    if (!isTyping) {
      setIsTyping(true);
      wsSendTypingStatus(conversationId, true);
    }

    // Réinitialiser le timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Arrêter la frappe après 3 secondes d'inactivité
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      wsSendTypingStatus(conversationId, false);
    }, 3000);
  }, [isTyping, wsSendTypingStatus, conversationId]);

  // Nettoyer le timeout au démontage
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-black via-neutral-900 to-black">
      {/* Élément audio caché pour la prévisualisation */}
      <audio ref={previewAudioRef} className="hidden" />
      
      {/* Header fixed amélioré */}
      <motion.div 
        className="fixed top-0 left-0 w-full z-30 flex items-center justify-between p-4 bg-gradient-to-r from-purple-900/80 via-indigo-900/80 to-purple-900/80 backdrop-blur-xl border-b border-purple-400/30 rounded-b-3xl shadow-2xl"
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <div className="flex items-center space-x-3">
          <motion.button
            onClick={() => router.back()}
            className="p-3 rounded-full bg-gradient-to-br from-purple-500/20 to-indigo-500/20 hover:from-purple-500/30 hover:to-indigo-500/30 transition-all duration-300 shadow-lg border border-purple-400/30"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <ArrowLeft size={20} className="text-white" />
          </motion.button>
          {otherUser ? (
            <motion.div 
              className="flex items-center space-x-3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <UserAvatar user={otherUser} onlineStatus={onlineStatus} isConnected={isConnected} />
              <div>
                <h2 className="font-semibold text-white text-lg leading-tight">{otherUser.name}</h2>
                <OnlineStatusIndicator onlineStatus={onlineStatus} isConnected={isConnected} formatLastSeen={formatLastSeen} />
              </div>
            </motion.div>
          ) : conversationLoading ? (
            <motion.div 
              className="flex items-center space-x-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500/20 to-indigo-500/20 rounded-full animate-pulse border border-purple-400/30"></div>
              <div>
                <div className="h-4 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 rounded w-24 animate-pulse"></div>
                <div className="h-3 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 rounded w-16 mt-1 animate-pulse"></div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              className="flex items-center space-x-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500/20 to-indigo-500/20 rounded-full border border-purple-400/30"></div>
              <div>
                <h2 className="font-semibold text-white">Utilisateur</h2>
                <p className="text-xs text-purple-200">Chargement...</p>
              </div>
            </motion.div>
          )}
        </div>
        <motion.button 
          className="p-3 rounded-full bg-gradient-to-br from-purple-500/20 to-indigo-500/20 hover:from-purple-500/30 hover:to-indigo-500/30 transition-all duration-300 shadow-lg border border-purple-400/30"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <MoreVertical size={20} className="text-white" />
        </motion.button>
      </motion.div>

      {/* Messages scrollable avec padding pour header et BottomNav+input */}
      <div className="pt-20 pb-32 px-4 flex flex-col space-y-6 overflow-y-auto h-screen">
        {/* Indicateur de frappe */}
        {onlineStatus.isTyping && (
          <motion.div
            className="flex justify-start px-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <motion.div
              className="flex items-center space-x-2 bg-gradient-to-r from-purple-600/20 to-indigo-600/20 rounded-2xl px-4 py-2 border border-purple-400/30"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div
                className="flex items-end space-x-1 h-4"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <div className="w-1 h-2 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '0s' }}></div>
                <div className="w-1 h-3 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-1 h-1 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
              </motion.div>
              <span className="text-xs text-purple-300 font-medium">
                {otherUser?.name || 'Quelqu\'un'} écrit...
              </span>
            </motion.div>
          </motion.div>
        )}
        {loading ? (
          <motion.div 
            className="flex items-center justify-center py-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="relative">
              <div className="animate-spin rounded-full h-12 w-12 border-2 border-purple-400 border-t-transparent"></div>
              <div className="absolute inset-0 animate-spin rounded-full h-12 w-12 border-2 border-indigo-400 border-t-transparent" style={{ animationDelay: '-0.5s' }}></div>
            </div>
          </motion.div>
        ) : (
          <AnimatePresence>
            {messages.length === 0 ? (
              <motion.div 
                className="text-center text-gray-400 py-12"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <div className="flex flex-col items-center space-y-4">
                  <motion.div
                    className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-indigo-500/20 rounded-full flex items-center justify-center border border-purple-400/30"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    <MessageCircle size={24} className="text-purple-300" />
                  </motion.div>
                  <p className="text-lg font-medium">Aucun message</p>
                  <p className="text-sm text-gray-500">Commencez une discussion !</p>
                </div>
              </motion.div>
            ) : (
              messages.map((message, index) => {
                const isOwnMessage = message.sender._id === session?.user?.id;
                return (
                  <motion.div
                    key={message._id}
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    transition={{ 
                      duration: 0.4, 
                      delay: index * 0.1,
                      ease: "easeOut"
                    }}
                    className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    <motion.div
                      className={`max-w-xs lg:max-w-md px-6 py-4 rounded-3xl shadow-2xl backdrop-blur-xl transition-all duration-300
                        ${isOwnMessage
                          ? 'bg-gradient-to-br from-purple-600 via-purple-500 to-indigo-500 text-white border-2 border-purple-400 shadow-purple-500/25'
                          : 'bg-gradient-to-br from-white/10 to-white/5 text-white border border-purple-400/30 shadow-lg'}
                      `}
                      style={{ wordBreak: 'break-word' }}
                      whileHover={{ scale: 1.02 }}
                      transition={{ duration: 0.2 }}
                    >
                      {/* Message content */}
                      {message.type === 'text' && (
                        <p className="text-base leading-relaxed">{message.content}</p>
                      )}
                      {message.type === 'image' && (
                        <motion.div 
                          className="mt-3 rounded-2xl overflow-hidden shadow-xl border-2 border-purple-300"
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: 0.2 }}
                        >
                          <img src={message.content} alt="Image envoyée" className="w-64 h-64 object-cover" />
                        </motion.div>
                      )}
                      {message.type === 'video' && (
                        <motion.div 
                          className="mt-3 rounded-2xl overflow-hidden shadow-xl border-2 border-purple-300"
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: 0.2 }}
                        >
                          <video src={message.content} controls className="w-64 h-64 object-cover" />
                        </motion.div>
                      )}
                      {message.type === 'audio' && (
                        <motion.div 
                          className="mt-3 bg-gradient-to-r from-purple-600/30 to-indigo-600/30 rounded-2xl p-5 border border-purple-400/40"
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: 0.2 }}
                        >
                          <div className="flex items-center space-x-4">
                            <motion.button
                              onClick={() => playAudio(message.content, message._id)}
                              className={`p-4 rounded-full transition-all duration-300 shadow-xl ${
                                playingAudio === message._id 
                                  ? 'bg-gradient-to-br from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 scale-110 shadow-red-500/50' 
                                  : 'bg-gradient-to-br from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 shadow-purple-500/50'
                              }`}
                              title={playingAudio === message._id ? 'Arrêter' : 'Écouter'}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              {playingAudio === message._id ? <Pause size={20} /> : <Play size={20} />}
                            </motion.button>
                            
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-sm font-medium text-white flex items-center">
                                  <Volume2 size={16} className="mr-2" />
                                  Message vocal
                                </span>
                                <span className="text-xs text-white/70 font-mono">
                                  {message.duration ? formatTime(message.duration) : 'Audio'}
                                </span>
                              </div>
                              
                              {/* Visualiseur audio animé */}
                              {playingAudio === message._id && (
                                <div className="mt-4">
                                  <AudioVisualizer isPlaying={playingAudio === message._id} duration={message.duration || 0} />
                                </div>
                              )}
                              
                              {/* Indicateur statique quand pas en lecture */}
                              {playingAudio !== message._id && (
                                <motion.div 
                                  className="flex items-center space-x-2 mt-3"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ delay: 0.3 }}
                                >
                                  <div className="flex items-end space-x-1 h-5">
                                    {[...Array(5)].map((_, index) => (
                                      <motion.div
                                        key={index}
                                        className="w-1 bg-purple-400/50 rounded-full"
                                        style={{ height: '5px' }}
                                        initial={{ height: '5px' }}
                                        animate={{ height: ['5px', '15px', '5px'] }}
                                        transition={{ 
                                          duration: 1.5, 
                                          repeat: Infinity, 
                                          delay: index * 0.2 
                                        }}
                                      />
                                    ))}
                                  </div>
                                  <span className="text-xs text-white/50">
                                    Cliquez pour écouter
                                  </span>
                                </motion.div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                      
                      {/* Statut du message et heure */}
                      <div className="flex justify-between items-center mt-3">
                        <MessageStatus message={message} isOwnMessage={isOwnMessage} readStatuses={readStatuses} currentUserId={session?.user?.id || ''} />
                        <span className="text-xs text-white/60 font-mono">
                          {formatMessageTime(message.createdAt)}
                        </span>
                      </div>
                    </motion.div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Barre d'envoi indépendante, juste au-dessus de la BottomNav */}
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
        handleTyping={handleTyping}
      />
    </div>
  );
} 