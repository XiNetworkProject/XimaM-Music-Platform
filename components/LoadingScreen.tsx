'use client';

import { motion } from 'framer-motion';
import SynauraLoader from './SynauraLoader';

interface LoadingScreenProps {
  text?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fullScreen?: boolean;
}

export default function LoadingScreen({ 
      text = 'Chargement de Synaura...', 
  size = 'xl',
  fullScreen = true 
}: LoadingScreenProps) {
  const containerClasses = fullScreen 
    ? 'fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-gray-800/90 via-gray-900/80 to-black/90 backdrop-blur-sm'
    : 'flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-800/90 via-gray-900/80 to-black/90 backdrop-blur-sm';

  return (
    <motion.div
      className={containerClasses}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Effet de particules simplifié */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -50, 0],
              opacity: [0, 0.5, 0],
              scale: [0, 1, 0],
            }}
            transition={{
              duration: 2 + Math.random(),
              repeat: Infinity,
              delay: Math.random(),
            }}
          />
        ))}
      </div>

      {/* Contenu principal */}
      <div className="relative z-10 text-center">
        {/* Logo Synaura */}
        <motion.div
          className="mb-8"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
            Synaura
          </h1>
          <p className="text-lg md:text-xl text-gray-400 mt-2">
            Partagez votre musique
          </p>
        </motion.div>

        {/* SynauraLoader */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
        >
          <SynauraLoader 
            size={size} 
            text={text}
            className="mx-auto"
          />
        </motion.div>

        {/* Barre de progression simplifiée */}
        <motion.div
          className="mt-6 max-w-md mx-auto"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: "100%", opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="w-full bg-gray-700/50 rounded-full h-1.5 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 1, delay: 0.5, ease: "easeInOut" }}
            />
          </div>
        </motion.div>

        {/* Message de chargement */}
        <motion.p
          className="mt-3 text-gray-300 text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          Chargement...
        </motion.p>
      </div>

      {/* Effet de lueur en arrière-plan - Supprimé pour plus de clarté */}
    </motion.div>
  );
}
