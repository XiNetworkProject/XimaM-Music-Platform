import { motion, AnimatePresence } from 'framer-motion';

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

interface MessageAnimationProps {
  message: Message;
  isOwnMessage: boolean;
  children: React.ReactNode;
}

export const MessageAnimation = ({ message, isOwnMessage, children }: MessageAnimationProps) => {
  return (
    <AnimatePresence>
      <motion.div
        key={message._id}
        initial={{ 
          opacity: 0, 
          scale: 0.8,
          y: isOwnMessage ? 20 : -20,
          x: isOwnMessage ? 20 : -20
        }}
        animate={{ 
          opacity: 1, 
          scale: 1,
          y: 0,
          x: 0
        }}
        exit={{ 
          opacity: 0, 
          scale: 0.8,
          y: isOwnMessage ? -20 : 20,
          x: isOwnMessage ? -20 : 20
        }}
        transition={{
          duration: 0.4,
          ease: "easeOut",
          type: "spring",
          stiffness: 100,
          damping: 15
        }}
        className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-4`}
      >
        <motion.div
          className={`max-w-xs lg:max-w-md xl:max-w-lg ${
            isOwnMessage 
              ? 'bg-gradient-to-br from-purple-500 to-indigo-500 text-white' 
              : 'bg-gradient-to-br from-gray-700 to-gray-800 text-white'
          } rounded-2xl px-4 py-3 shadow-lg border border-purple-400/30`}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          initial={{ rotateY: isOwnMessage ? 15 : -15 }}
          animate={{ rotateY: 0 }}
          transition={{ duration: 0.3 }}
        >
          {children}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Composant pour l'animation de frappe
export const TypingAnimation = ({ isTyping, userName }: { isTyping: boolean; userName: string }) => {
  if (!isTyping) return null;

  return (
    <motion.div
      className="flex justify-start px-6 mb-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
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
          <motion.div
            className="w-1 h-2 bg-purple-400 rounded-full"
            animate={{ height: [8, 16, 8] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
          />
          <motion.div
            className="w-1 h-3 bg-purple-400 rounded-full"
            animate={{ height: [12, 20, 12] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
          />
          <motion.div
            className="w-1 h-1 bg-purple-400 rounded-full"
            animate={{ height: [4, 12, 4] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
          />
        </motion.div>
        <span className="text-xs text-purple-300 font-medium">
          {userName} écrit...
        </span>
      </motion.div>
    </motion.div>
  );
};

// Composant pour l'animation de statut de message
export const MessageStatusAnimation = ({ 
  isOwnMessage, 
  isSeen, 
  isDelivered 
}: { 
  isOwnMessage: boolean; 
  isSeen: boolean; 
  isDelivered: boolean; 
}) => {
  if (!isOwnMessage) return null;

  return (
    <motion.div
      className="flex items-center space-x-1 mt-1"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.5, duration: 0.3 }}
    >
      {isDelivered && (
        <motion.div
          className="w-3 h-3 text-green-400"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.8, duration: 0.2 }}
        >
          ✓
        </motion.div>
      )}
      {isSeen && (
        <motion.div
          className="w-3 h-3 text-blue-400"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 1.2, duration: 0.2 }}
        >
          👁️
        </motion.div>
      )}
    </motion.div>
  );
}; 