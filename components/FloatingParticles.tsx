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

    // Créer 15 particules avec des positions et propriétés aléatoires
    const newParticles: Particle[] = Array.from({ length: 15 }, (_, index) => ({
      id: index,
      x: Math.random() * 100, // Position X en pourcentage
      y: Math.random() * 100, // Position Y en pourcentage
      size: Math.random() * 8 + 3, // Taille entre 3 et 11px
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 3, // Délai d'animation aléatoire
      duration: Math.random() * 4 + 5, // Durée entre 5 et 9 secondes
      type: Math.random() > 0.7 ? 'glow' : Math.random() > 0.5 ? 'pulse' : 'normal'
    }));

    setParticles(newParticles);
  }, [isPlaying]);

  if (!isPlaying) return null;

  return (
    <div className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}>
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
            y: [-10, -40, -80, -120, -160],
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