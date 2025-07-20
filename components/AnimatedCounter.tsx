'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';

interface AnimatedCounterProps {
  value: number;
  formatValue?: (value: number) => string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'minimal' | 'card';
  showIcon?: boolean;
  icon?: React.ReactNode;
  prefix?: string;
  suffix?: string;
  animation?: 'slide' | 'flip' | 'fade' | 'bounce';
  duration?: number;
  delay?: number;
}

const sizeConfig = {
  sm: {
    container: 'text-xs',
    gap: 'gap-1'
  },
  md: {
    container: 'text-sm',
    gap: 'gap-1.5'
  },
  lg: {
    container: 'text-base',
    gap: 'gap-2'
  }
};

const variantConfig = {
  default: {
    base: 'text-gray-900 dark:text-white',
    highlight: 'text-blue-600 dark:text-blue-400'
  },
  minimal: {
    base: 'text-gray-600 dark:text-gray-300',
    highlight: 'text-blue-600 dark:text-blue-400'
  },
  card: {
    base: 'text-white/90',
    highlight: 'text-blue-400'
  }
};

const animationConfig = {
  slide: {
    initial: { y: 20, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: -20, opacity: 0 },
    transition: { duration: 0.3, ease: "easeOut" as const }
  },
  flip: {
    initial: { rotateX: -90, opacity: 0 },
    animate: { rotateX: 0, opacity: 1 },
    exit: { rotateX: 90, opacity: 0 },
    transition: { duration: 0.4, ease: "easeOut" as const }
  },
  fade: {
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.8 },
    transition: { duration: 0.2, ease: "easeOut" as const }
  },
  bounce: {
    initial: { scale: 0.3, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.3, opacity: 0 },
    transition: { 
      duration: 0.5, 
      ease: [0.175, 0.885, 0.32, 1.275] as const
    }
  }
};

export default function AnimatedCounter({
  value,
  formatValue = (val) => val.toString(),
  className = '',
  size = 'md',
  variant = 'default',
  showIcon = false,
  icon,
  prefix = '',
  suffix = '',
  animation = 'slide',
  duration = 0.3,
  delay = 0
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);
  const prevValueRef = useRef(value);
  const config = sizeConfig[size];
  const variantStyle = variantConfig[variant];
  const animConfig = animationConfig[animation];

  // Formater la valeur avec K/M pour les grands nombres
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  // Détecter les changements de valeur
  useEffect(() => {
    if (value !== prevValueRef.current) {
      setIsAnimating(true);
      
      // Délai pour l'animation
      setTimeout(() => {
        setDisplayValue(value);
        setIsAnimating(false);
      }, delay);
      
      prevValueRef.current = value;
    }
  }, [value, delay]);

  const formattedValue = formatValue ? formatValue(displayValue) : formatNumber(displayValue);
  const fullText = `${prefix}${formattedValue}${suffix}`;

  return (
    <motion.div
      className={`flex items-center ${config.gap} ${config.container} ${variantStyle.base} ${className}`}
      animate={isAnimating ? {
        scale: [1, 1.05, 1],
        color: [variantStyle.base, variantStyle.highlight, variantStyle.base]
      } : {}}
      transition={{ duration: 0.3 }}
    >
      {/* Icône */}
      {showIcon && icon && (
        <motion.div
          animate={isAnimating ? {
            scale: [1, 1.2, 1],
            rotate: [0, 10, -10, 0]
          } : {}}
          transition={{ duration: 0.4 }}
        >
          {icon}
        </motion.div>
      )}

      {/* Compteur animé */}
      <div className="relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.span
            key={displayValue}
            {...animConfig}
            className={`font-medium ${isAnimating ? variantStyle.highlight : ''}`}
          >
            {fullText}
          </motion.span>
        </AnimatePresence>

        {/* Effet de particules pour les changements */}
        <AnimatePresence>
          {isAnimating && (
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 bg-blue-500 rounded-full"
                  initial={{ 
                    x: 0, 
                    y: 0, 
                    opacity: 1,
                    scale: 0
                  }}
                  animate={{
                    x: [0, Math.random() * 20 - 10],
                    y: [0, -20 - Math.random() * 10],
                    opacity: [1, 0],
                    scale: [0, 1, 0]
                  }}
                  transition={{
                    duration: 0.8,
                    delay: i * 0.1,
                    ease: "easeOut"
                  }}
                  style={{
                    left: '50%',
                    top: '50%'
                  }}
                />
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// Composant spécialisé pour les likes
export function AnimatedLikeCounter({ 
  value, 
  isLiked, 
  ...props 
}: AnimatedCounterProps & { isLiked?: boolean }) {
  return (
    <AnimatedCounter
      {...props}
      value={value}
      prefix={isLiked ? '❤️ ' : ''}
      animation="bounce"
      className={`${isLiked ? 'text-red-500' : ''} ${props.className || ''}`}
    />
  );
}

// Composant spécialisé pour les écoutes
export function AnimatedPlaysCounter({ 
  value, 
  ...props 
}: AnimatedCounterProps) {
  return (
    <AnimatedCounter
      {...props}
      value={value}
      animation="slide"
      className={`text-blue-500 ${props.className || ''}`}
    />
  );
}

// Composant spécialisé pour les abonnements
export function AnimatedSubscriptionCounter({ 
  value, 
  isActive, 
  ...props 
}: AnimatedCounterProps & { isActive?: boolean }) {
  return (
    <AnimatedCounter
      {...props}
      value={value}
      prefix={isActive ? '⭐ ' : ''}
      animation="flip"
      className={`${isActive ? 'text-green-500' : ''} ${props.className || ''}`}
    />
  );
} 