'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AnimatedLikeCounter, AnimatedPlaysCounter, AnimatedSubscriptionCounter } from './AnimatedCounter';
import { Heart, Headphones, Star } from 'lucide-react';

export default function AnimationDemo() {
  const [likeCount, setLikeCount] = useState(42);
  const [playsCount, setPlaysCount] = useState(1234);
  const [subscriptionCount, setSubscriptionCount] = useState(5);
  const [isLiked, setIsLiked] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Simuler des changements automatiques pour la démo
  useEffect(() => {
    const interval = setInterval(() => {
      // Changement aléatoire des likes
      if (Math.random() > 0.7) {
        setLikeCount(prev => prev + (Math.random() > 0.5 ? 1 : -1));
        setIsLiked(prev => !prev);
      }
      
      // Changement des écoutes
      if (Math.random() > 0.8) {
        setPlaysCount(prev => prev + Math.floor(Math.random() * 10) + 1);
      }
      
      // Changement des abonnements
      if (Math.random() > 0.9) {
        setSubscriptionCount(prev => prev + (Math.random() > 0.5 ? 1 : -1));
        setIsSubscribed(prev => !prev);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const handleLikeClick = () => {
    setLikeCount(prev => prev + (isLiked ? -1 : 1));
    setIsLiked(!isLiked);
  };

  const handleSubscribeClick = () => {
    setSubscriptionCount(prev => prev + (isSubscribed ? -1 : 1));
    setIsSubscribed(!isSubscribed);
  };

  return (
    <div className="fixed bottom-4 left-4 z-50 bg-black/80 backdrop-blur-sm rounded-lg p-4 border border-white/20">
      <h3 className="text-white font-semibold mb-4">🎬 Démo Animations</h3>
      
      <div className="space-y-4">
        {/* Likes avec animation bounce */}
        <div className="flex items-center gap-3">
          <span className="text-white text-sm">Likes:</span>
          <div onClick={handleLikeClick} className="cursor-pointer">
            <AnimatedLikeCounter
              value={likeCount}
              isLiked={isLiked}
              size="md"
              variant="minimal"
              showIcon={true}
              icon={<Heart size={16} />}
              animation="bounce"
            />
          </div>
        </div>

        {/* Écoutes avec animation slide */}
        <div className="flex items-center gap-3">
          <span className="text-white text-sm">Écoutes:</span>
          <AnimatedPlaysCounter
            value={playsCount}
            size="md"
            variant="minimal"
            showIcon={true}
            icon={<Headphones size={16} />}
            animation="slide"
          />
        </div>

        {/* Abonnements avec animation flip */}
        <div className="flex items-center gap-3">
          <span className="text-white text-sm">Abonnements:</span>
          <div onClick={handleSubscribeClick} className="cursor-pointer">
            <AnimatedSubscriptionCounter
              value={subscriptionCount}
              isActive={isSubscribed}
              size="md"
              variant="minimal"
              showIcon={true}
              icon={<Star size={16} />}
              animation="flip"
            />
          </div>
        </div>

        {/* Informations */}
        <div className="text-xs text-gray-400 mt-4 pt-3 border-t border-white/10">
          <p>✨ Animations automatiques toutes les 2s</p>
          <p>🎯 Cliquez pour tester manuellement</p>
          <p>💫 Effets de particules inclus</p>
        </div>
      </div>
    </div>
  );
} 