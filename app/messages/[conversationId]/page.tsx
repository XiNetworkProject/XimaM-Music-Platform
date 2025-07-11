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
  Clock
} from 'lucide-react';
import toast from 'react-hot-toast';

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
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);

      const response = await fetch('/api/messages/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (response.ok) {
        sendMessage(type, data.url, data.duration);
      } else {
        toast.error(data.error || 'Erreur lors de l\'upload');
      }
    } catch (error) {
      toast.error('Erreur de connexion');
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const type = event.target.getAttribute('data-type') as 'image' | 'video' | 'audio';
    
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
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const file = new File([audioBlob], 'audio.wav', { type: 'audio/wav' });
        handleFileUpload(file, 'audio');
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      toast.error('Erreur d\'accès au microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
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
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white/10 backdrop-blur-sm border-b border-white/20">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <ArrowLeft size={20} className="text-white" />
          </button>
          {otherUser ? (
            <div className="flex items-center space-x-3">
              <img
                src={otherUser.avatar || '/default-avatar.png'}
                alt={otherUser.name}
                className="w-10 h-10 rounded-full object-cover"
              />
              <div>
                <h2 className="font-semibold text-white">{otherUser.name}</h2>
                <p className="text-sm text-gray-300">@{otherUser.username}</p>
              </div>
            </div>
          ) : conversationLoading ? (
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gray-600 rounded-full animate-pulse"></div>
              <div>
                <div className="h-4 bg-gray-600 rounded w-24 animate-pulse"></div>
                <div className="h-3 bg-gray-700 rounded w-16 mt-1 animate-pulse"></div>
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gray-600 rounded-full"></div>
              <div>
                <h2 className="font-semibold text-white">Utilisateur</h2>
                <p className="text-sm text-gray-300">Chargement...</p>
              </div>
            </div>
          )}
        </div>
        <button className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
          <MoreVertical size={20} className="text-white" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                  <div className={`max-w-xs lg:max-w-md ${message.sender._id === session.user?.id ? 'bg-purple-600' : 'bg-white/10'} rounded-2xl px-4 py-2 backdrop-blur-sm`}>
                    {/* Message content */}
                    {message.type === 'text' && (
                      <p className="text-white">{message.content}</p>
                    )}
                    
                    {message.type === 'image' && (
                      <img
                        src={message.content}
                        alt="Image"
                        className="rounded-lg max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => window.open(message.content, '_blank')}
                      />
                    )}
                    
                    {message.type === 'video' && (
                      <video
                        src={message.content}
                        controls
                        className="rounded-lg max-w-full h-auto"
                        preload="metadata"
                      />
                    )}
                    
                    {message.type === 'audio' && (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => playAudio(message.content, message._id)}
                          className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                        >
                          {playingAudio === message._id ? (
                            <Pause size={16} className="text-white" />
                          ) : (
                            <Play size={16} className="text-white" />
                          )}
                        </button>
                        <div className="flex-1 bg-white/20 rounded-full h-2">
                          <div className="bg-white h-2 rounded-full" style={{ width: '0%' }}></div>
                        </div>
                        <span className="text-xs text-white">
                          {message.duration ? formatTime(message.duration) : '--:--'}
                        </span>
                      </div>
                    )}
                    
                    {/* Message time */}
                    <p className="text-xs text-gray-300 mt-1">
                      {formatMessageTime(message.createdAt)}
                    </p>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white/10 backdrop-blur-sm border-t border-white/20">
        <div className="flex items-center space-x-2">
          {/* Media options */}
          <div className="relative">
            <button
              onClick={() => setShowMediaOptions(!showMediaOptions)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <MoreVertical size={20} className="text-white" />
            </button>
            
            {showMediaOptions && (
              <div className="absolute bottom-full left-0 mb-2 bg-white/20 backdrop-blur-sm rounded-lg p-2 space-y-1">
                <button
                  onClick={() => {
                    fileInputRef.current?.setAttribute('data-type', 'image');
                    fileInputRef.current?.click();
                    setShowMediaOptions(false);
                  }}
                  className="flex items-center space-x-2 w-full px-3 py-2 rounded hover:bg-white/20 transition-colors"
                >
                  <Image size={16} className="text-white" />
                  <span className="text-white text-sm">Image</span>
                </button>
                <button
                  onClick={() => {
                    fileInputRef.current?.setAttribute('data-type', 'video');
                    fileInputRef.current?.click();
                    setShowMediaOptions(false);
                  }}
                  className="flex items-center space-x-2 w-full px-3 py-2 rounded hover:bg-white/20 transition-colors"
                >
                  <Video size={16} className="text-white" />
                  <span className="text-white text-sm">Vidéo</span>
                </button>
              </div>
            )}
          </div>

          {/* Audio recording */}
          <button
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onMouseLeave={stopRecording}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            className={`p-2 rounded-full transition-colors ${
              isRecording 
                ? 'bg-red-500 hover:bg-red-600' 
                : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            <Mic size={20} className="text-white" />
          </button>

          {/* Text input */}
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendText()}
            placeholder="Tapez votre message..."
            className="flex-1 px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            disabled={uploading}
          />

          {/* Send button */}
          <button
            onClick={handleSendText}
            disabled={!newMessage.trim() || uploading}
            className="p-2 rounded-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={20} className="text-white" />
          </button>
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
    </div>
  );
} 