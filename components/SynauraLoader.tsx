'use client';

import { motion } from 'framer-motion';

interface SynauraLoaderProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  text?: string;
  className?: string;
}

export default function SynauraLoader({ 
  size = 'md', 
  text = 'Chargement...', 
  className = '' 
}: SynauraLoaderProps) {
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
    xl: 'w-48 h-48'
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl'
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      {/* Conteneur du symbole animé */}
      <motion.div
        className={`relative ${sizeClasses[size]}`}
        animate={{
          rotate: [0, 360],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "linear"
        }}
      >
        {/* Symbole Synaura animé */}
        <svg 
          viewBox="0 0 240 240" 
          className="w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="aurora-loader" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#22D3EE"/>
              <stop offset="50%" stopColor="#8B5CF6"/>
              <stop offset="100%" stopColor="#D946EF"/>
            </linearGradient>
            <filter id="pulse-glow-loader" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="3" result="blur"/>
              <feColorMatrix 
                in="blur" 
                type="matrix" 
                values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" 
                result="glow"
              />
              <feMerge>
                <feMergeNode in="glow"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          {/* Symbole S principal */}
          <motion.path
            d="M60 72C60 36 180 36 180 72C180 108 60 108 60 144C60 180 180 180 180 144"
            fill="none"
            stroke="url(#aurora-loader)"
            strokeWidth="28"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#pulse-glow-loader)"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ 
              pathLength: [0, 1, 0],
              opacity: [0.3, 1, 0.3]
            }}
            transition={{
              pathLength: { duration: 3, repeat: Infinity, ease: "easeInOut" },
              opacity: { duration: 2, repeat: Infinity, ease: "easeInOut" }
            }}
          />
          
          {/* Effet de particules */}
          <motion.circle
            cx="120"
            cy="120"
            r="100"
            fill="none"
            stroke="url(#aurora-loader)"
            strokeWidth="1"
            opacity="0.3"
            animate={{
              r: [80, 120, 80],
              opacity: [0.1, 0.5, 0.1]
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          
          {/* Points lumineux */}
          <motion.circle
            cx="60"
            cy="72"
            r="4"
            fill="#22D3EE"
            animate={{
              r: [2, 6, 2],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          
          <motion.circle
            cx="180"
            cy="144"
            r="4"
            fill="#D946EF"
            animate={{
              r: [2, 6, 2],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.5
            }}
          />
          
          {/* Lueur pulsante */}
          <motion.circle
            cx="120"
            cy="120"
            r="90"
            fill="none"
            stroke="url(#aurora-loader)"
            strokeWidth="0.5"
            opacity="0.2"
            animate={{
              r: [85, 95, 85],
              opacity: [0.1, 0.4, 0.1]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </svg>
      </motion.div>
      
      {/* Texte de chargement */}
      {text && (
        <motion.p
          className={`mt-4 text-center font-medium text-gray-300 ${textSizes[size]}`}
          animate={{
            opacity: [0.5, 1, 0.5]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          {text}
        </motion.p>
      )}
      
      {/* Effet de lueur en arrière-plan */}
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-pink-500/10 rounded-full blur-3xl opacity-50" />
    </div>
  );
}
