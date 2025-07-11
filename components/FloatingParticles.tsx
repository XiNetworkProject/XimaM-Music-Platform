'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  delay: number;
  duration: number;
  type: 'normal' | 'glow' | 'pulse';
}

interface FloatingParticlesProps {
  isPlaying: boolean;
  className?: string;
}

const colors = [
  '#667eea', // Bleu-violet
  '#764ba2', // Violet
  '#f093fb', // Rose clair
  '#f5576c', // Rose foncé
  '#4facfe', // Bleu clair
  '#00f2fe', // Cyan
  '#43e97b', // Vert clair
  '#38f9d7', // Turquoise
  '#ff9a9e', // Rose pêche
  '#a8edea', // Bleu menthe
];

export default function FloatingParticles({ isPlaying, className = '' }: FloatingParticlesProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!isPlaying) {
      setParticles([]);
      return;
    }

    // Créer 8 particules discrètes autour du mini player
    const newParticles: Particle[] = Array.from({ length: 8 }, (_, index) => {
      // Positionner les particules plus proches du player
      let x, y;
      const side = Math.floor(Math.random() * 4); // 0: haut, 1: droite, 2: bas, 3: gauche
      
      switch (side) {
        case 0: // Haut
          x = Math.random() * 100;
          y = -10 - Math.random() * 15; // Plus proche du player
          break;
        case 1: // Droite
          x = 100 + Math.random() * 15; // Plus proche du player
          y = Math.random() * 100;
          break;
        case 2: // Bas
          x = Math.random() * 100;
          y = 100 + Math.random() * 15; // Plus proche du player
          break;
        case 3: // Gauche
          x = -10 - Math.random() * 15; // Plus proche du player
          y = Math.random() * 100;
          break;
        default:
          x = Math.random() * 100;
          y = Math.random() * 100;
      }

      return {
        id: index,
        x,
        y,
        size: Math.random() * 3 + 1, // Taille plus petite (1-4px)
        color: colors[Math.floor(Math.random() * colors.length)] as string,
        delay: Math.random() * 1.5, // Délai plus court
        duration: Math.random() * 2 + 3, // Durée plus courte (3-5 secondes)
        type: Math.random() > 0.8 ? 'glow' : Math.random() > 0.6 ? 'pulse' : 'normal'
      };
    });

    setParticles(newParticles);
  }, [isPlaying]);

  if (!isPlaying) return null;

  return (
    <div className={`absolute pointer-events-none overflow-visible ${className}`} style={{
      top: '-30px',
      left: '-30px',
      right: '-30px',
      bottom: '-30px',
      zIndex: 9998
    }}>
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className={`absolute rounded-full ${
            particle.type === 'glow' ? 'particle-glow' : 
            particle.type === 'pulse' ? 'particle-pulse' : ''
          }`}
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            backgroundColor: particle.color,
            boxShadow: particle.type === 'glow' 
              ? `0 0 ${particle.size * 2}px ${particle.color}` 
              : `0 0 ${particle.size * 1.5}px ${particle.color}`,
          }}
          initial={{ 
            opacity: 0, 
            scale: 0,
            y: 0,
            x: 0
          }}
          animate={{ 
            opacity: [0, 0.7, 0.4, 0.2, 0],
            scale: [0, 1, 1.1, 1, 0],
            y: [-5, -15, -25, -35, -45],
            x: [-2, 3, -1, 4, -2]
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  );
} 