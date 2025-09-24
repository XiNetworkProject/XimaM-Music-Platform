'use client';

import { motion } from 'framer-motion';
import { Volume2, VolumeX, Zap } from 'lucide-react';
import { useAudioQuality } from '@/hooks/useAudioQuality';

interface AudioQualityIndicatorProps {
  className?: string;
  showUpgrade?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function AudioQualityIndicator({ 
  className = '', 
  showUpgrade = false,
  size = 'sm' 
}: AudioQualityIndicatorProps) {
  const quality = useAudioQuality();

  const getIcon = () => {
    switch (quality.maxQualityKbps) {
      case 128:
        return <VolumeX className={size === 'lg' ? 'w-5 h-5' : size === 'md' ? 'w-4 h-4' : 'w-3 h-3'} />;
      case 256:
        return <Volume2 className={size === 'lg' ? 'w-5 h-5' : size === 'md' ? 'w-4 h-4' : 'w-3 h-3'} />;
      case 320:
        return <Zap className={size === 'lg' ? 'w-5 h-5' : size === 'md' ? 'w-4 h-4' : 'w-3 h-3'} />;
      default:
        return <VolumeX className={size === 'lg' ? 'w-5 h-5' : size === 'md' ? 'w-4 h-4' : 'w-3 h-3'} />;
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'lg':
        return 'px-3 py-1.5 text-sm';
      case 'md':
        return 'px-2 py-1 text-xs';
      case 'sm':
      default:
        return 'px-1.5 py-0.5 text-xs';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`inline-flex items-center gap-1 rounded-full border ${getSizeClasses()} ${className}`}
      style={{
        backgroundColor: quality.maxQualityKbps === 128 ? 'rgba(107, 114, 128, 0.1)' :
                         quality.maxQualityKbps === 256 ? 'rgba(59, 130, 246, 0.1)' :
                         'rgba(147, 51, 234, 0.1)',
        borderColor: quality.maxQualityKbps === 128 ? 'rgba(107, 114, 128, 0.3)' :
                    quality.maxQualityKbps === 256 ? 'rgba(59, 130, 246, 0.3)' :
                    'rgba(147, 51, 234, 0.3)',
      }}
    >
      <span className={quality.qualityColor}>
        {getIcon()}
      </span>
      <span className={`font-medium ${quality.qualityColor}`}>
        {quality.maxQualityKbps} kbps
      </span>
      
      {showUpgrade && quality.isUpgradeable && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="ml-1"
        >
          <span className="text-xs text-yellow-400">↑</span>
        </motion.div>
      )}
    </motion.div>
  );
}

// Composant pour afficher un tooltip avec les détails de qualité
export function AudioQualityTooltip({ children }: { children: React.ReactNode }) {
  const quality = useAudioQuality();

  return (
    <div className="group relative">
      {children}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black/90 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
        <div className="font-medium">{quality.qualityLabel}</div>
        <div className="text-gray-300">{quality.maxQualityKbps} kbps</div>
        {quality.isUpgradeable && quality.upgradeMessage && (
          <div className="text-yellow-300 mt-1">{quality.upgradeMessage}</div>
        )}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black/90"></div>
      </div>
    </div>
  );
}
