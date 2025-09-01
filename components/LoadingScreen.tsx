'use client';

import { motion } from 'framer-motion';
import SynauraLoader from './SynauraLoader';

interface LoadingScreenProps {
  text?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fullScreen?: boolean;
}

export default function LoadingScreen({ 
  text = 'Chargement de XimaM...', 
  size = 'xl',
  fullScreen = true 
}: LoadingScreenProps) {
  const containerClasses = fullScreen 
    ? 'fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900'
    : 'flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900';

  return (
    <motion.div
      className={containerClasses}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Effet de particules en arrière-plan */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -100, 0],
              opacity: [0, 1, 0],
              scale: [0, 1, 0],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Contenu principal */}
      <div className="relative z-10 text-center">
        {/* Logo XimaM */}
        <motion.div
          className="mb-8"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
            XimaM
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

        {/* Barre de progression stylée */}
        <motion.div
          className="mt-8 max-w-md mx-auto"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: "100%", opacity: 1 }}
          transition={{ duration: 1, delay: 0.6 }}
        >
          <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 2, delay: 0.8, ease: "easeInOut" }}
            />
          </div>
        </motion.div>

        {/* Message de chargement */}
        <motion.p
          className="mt-4 text-gray-400 text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1 }}
        >
          Préparation de votre expérience musicale...
        </motion.p>
      </div>

      {/* Effet de lueur en arrière-plan */}
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-purple-500/5 to-pink-500/5 blur-3xl" />
    </motion.div>
  );
}
