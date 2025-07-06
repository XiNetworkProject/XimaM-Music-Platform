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
  '#fed6e3', // Rose pâle
  '#ffecd2', // Orange pâle
];

export default function FloatingParticles({ isPlaying, className = '' }: FloatingParticlesProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!isPlaying) {
      setParticles([]);
      return;
    }

    // Créer 20 particules qui apparaissent AUTOUR du mini player
    const newParticles: Particle[] = Array.from({ length: 20 }, (_, index) => {
      // Positionner les particules autour du player (pas dedans)
      let x, y;
      const side = Math.floor(Math.random() * 4); // 0: haut, 1: droite, 2: bas, 3: gauche
      
      switch (side) {
        case 0: // Haut
          x = Math.random() * 100;
          y = -20 - Math.random() * 30; // Au-dessus du player
          break;
        case 1: // Droite
          x = 100 + Math.random() * 30; // À droite du player
          y = Math.random() * 100;
          break;
        case 2: // Bas
          x = Math.random() * 100;
          y = 100 + Math.random() * 30; // En-dessous du player
          break;
        case 3: // Gauche
          x = -20 - Math.random() * 30; // À gauche du player
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
        size: Math.random() * 6 + 2, // Taille entre 2 et 8px
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 2, // Délai d'animation aléatoire
        duration: Math.random() * 3 + 4, // Durée entre 4 et 7 secondes
        type: Math.random() > 0.7 ? 'glow' : Math.random() > 0.5 ? 'pulse' : 'normal'
      };
    });

    setParticles(newParticles);
  }, [isPlaying]);

  if (!isPlaying) return null;

  return (
    <div className={`absolute pointer-events-none overflow-visible ${className}`} style={{
      top: '-50px',
      left: '-50px',
      right: '-50px',
      bottom: '-50px',
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
              ? `0 0 ${particle.size * 3}px ${particle.color}` 
              : `0 0 ${particle.size * 2}px ${particle.color}`,
          }}
          initial={{ 
            opacity: 0, 
            scale: 0,
            y: 0,
            x: 0
          }}
          animate={{ 
            opacity: [0, 0.9, 0.6, 0.3, 0],
            scale: [0, 1, 1.3, 1, 0],
            y: [-10, -30, -60, -90, -120],
            x: [-5, 8, -3, 12, -8]
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