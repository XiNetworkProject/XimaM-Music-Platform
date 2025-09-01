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
      {/* Conteneur du symbole animé - Version simplifiée */}
      <motion.div
        className={`relative ${sizeClasses[size]}`}
        animate={{
          rotate: [0, 360],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "linear"
        }}
      >
        {/* Symbole Synaura simplifié */}
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
          </defs>
          
          {/* Symbole S principal - Animation simplifiée */}
          <motion.path
            d="M60 72C60 36 180 36 180 72C180 108 60 108 60 144C60 180 180 180 180 144"
            fill="none"
            stroke="url(#aurora-loader)"
            strokeWidth="28"
            strokeLinecap="round"
            strokeLinejoin="round"
            animate={{ 
              opacity: [0.5, 1, 0.5]
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          
          {/* Points lumineux simplifiés */}
          <motion.circle
            cx="60"
            cy="72"
            r="3"
            fill="#22D3EE"
            animate={{
              opacity: [0.3, 1, 0.3]
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          
          <motion.circle
            cx="180"
            cy="144"
            r="3"
            fill="#D946EF"
            animate={{
              opacity: [0.3, 1, 0.3]
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.5
            }}
          />
        </svg>
      </motion.div>
      
      {/* Texte de chargement */}
      {text && (
        <motion.p
          className={`mt-3 text-center font-medium text-gray-200 ${textSizes[size]}`}
          animate={{
            opacity: [0.7, 1, 0.7]
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          {text}
        </motion.p>
      )}
    </div>
  );
}
