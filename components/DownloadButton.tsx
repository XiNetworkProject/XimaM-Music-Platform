'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Lock, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useDownloadPermission, downloadAudioFile, generateFilename } from '@/hooks/useDownloadPermission';
import DownloadDialog from './DownloadDialog';
import toast from 'react-hot-toast';

interface DownloadButtonProps {
  audioUrl: string;
  trackTitle: string;
  artistName: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showUpgrade?: boolean;
}

export default function DownloadButton({
  audioUrl,
  trackTitle,
  artistName,
  className = '',
  size = 'md',
  showUpgrade = true
}: DownloadButtonProps) {
  const { canDownload, upgradeMessage } = useDownloadPermission();
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStatus, setDownloadStatus] = useState<'idle' | 'downloading' | 'success' | 'error'>('idle');
  const [showDialog, setShowDialog] = useState(false);

  const getSizeClasses = () => {
    switch (size) {
      case 'lg':
        return 'px-4 py-2 text-sm';
      case 'sm':
        return 'px-2 py-1 text-xs';
      case 'md':
      default:
        return 'px-3 py-1.5 text-sm';
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'lg':
        return 18;
      case 'sm':
        return 12;
      case 'md':
      default:
        return 14;
    }
  };

  const handleDownloadClick = () => {
    if (!canDownload) {
      toast.error(upgradeMessage || 'Téléchargement non disponible');
      return;
    }

    if (!audioUrl) {
      toast.error('URL audio non disponible');
      return;
    }

    setShowDialog(true);
  };

  const handleDownloadConfirm = async () => {
    try {
      setIsDownloading(true);
      setDownloadStatus('downloading');
      setDownloadProgress(0);

      const filename = generateFilename(trackTitle, artistName);
      
      await downloadAudioFile(audioUrl, filename, (progress) => {
        setDownloadProgress(progress);
      });

      setDownloadStatus('success');
      toast.success(`Téléchargement réussi: ${filename}`);
      
      // Fermer le dialog après succès
      setTimeout(() => {
        setShowDialog(false);
        setDownloadStatus('idle');
        setDownloadProgress(0);
      }, 2000);

    } catch (error) {
      setDownloadStatus('error');
      toast.error('Erreur lors du téléchargement');
      
      // Reset après 3 secondes
      setTimeout(() => {
        setDownloadStatus('idle');
        setDownloadProgress(0);
      }, 3000);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDialogClose = () => {
    if (!isDownloading) {
      setShowDialog(false);
    }
  };

  const getButtonContent = () => {
    if (downloadStatus === 'downloading') {
      return (
        <>
          <Loader2 size={getIconSize()} className="animate-spin" />
          <span>{downloadProgress}%</span>
        </>
      );
    }
    
    if (downloadStatus === 'success') {
      return (
        <>
          <CheckCircle size={getIconSize()} className="text-green-400" />
          <span>Terminé</span>
        </>
      );
    }
    
    if (downloadStatus === 'error') {
      return (
        <>
          <AlertCircle size={getIconSize()} className="text-red-400" />
          <span>Erreur</span>
        </>
      );
    }

    if (!canDownload) {
      return (
        <>
          <Lock size={getIconSize()} />
          <span>Télécharger</span>
        </>
      );
    }

    return (
      <>
        <Download size={getIconSize()} />
        <span>Télécharger</span>
      </>
    );
  };

  const getButtonStyle = () => {
    const baseClasses = `inline-flex items-center gap-2 rounded-full transition-all duration-200 ${getSizeClasses()} ${className}`;
    
    if (!canDownload) {
      return `${baseClasses} text-white/60 bg-white/10 border border-white/20 cursor-not-allowed`;
    }
    
    if (downloadStatus === 'downloading') {
      return `${baseClasses} text-blue-400 bg-blue-400/10 border border-blue-400/30`;
    }
    
    if (downloadStatus === 'success') {
      return `${baseClasses} text-green-400 bg-green-400/10 border border-green-400/30`;
    }
    
    if (downloadStatus === 'error') {
      return `${baseClasses} text-red-400 bg-red-400/10 border border-red-400/30`;
    }

    return `${baseClasses} text-white/80 bg-white/10 border border-white/20 hover:bg-white/20 hover:text-white hover:scale-105 active:scale-95`;
  };

  return (
    <>
      <motion.button
        onClick={handleDownloadClick}
        disabled={isDownloading}
        className={getButtonStyle()}
        whileHover={canDownload && downloadStatus === 'idle' ? { scale: 1.05 } : {}}
        whileTap={canDownload && downloadStatus === 'idle' ? { scale: 0.95 } : {}}
        title={!canDownload ? upgradeMessage : 'Télécharger la musique'}
      >
      {getButtonContent()}
      
      {/* Barre de progression */}
      <AnimatePresence>
        {downloadStatus === 'downloading' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 rounded-b-full overflow-hidden"
          >
            <motion.div
              className="h-full bg-gradient-to-r from-blue-400 to-purple-400"
              initial={{ width: '0%' }}
              animate={{ width: `${downloadProgress}%` }}
              transition={{ duration: 0.3 }}
            />
          </motion.div>
        )}
      </AnimatePresence>
      </motion.button>

      <DownloadDialog
        isOpen={showDialog}
        onClose={handleDialogClose}
        onConfirm={handleDownloadConfirm}
        trackTitle={trackTitle}
        artistName={artistName}
        isDownloading={isDownloading}
      />
    </>
  );
}

// Composant pour afficher un tooltip avec les détails de téléchargement
export function DownloadTooltip({ children }: { children: React.ReactNode }) {
  const { canDownload, upgradeMessage } = useDownloadPermission();

  return (
    <div className="group relative">
      {children}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black/90 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
        <div className="font-medium">
          {canDownload ? 'Télécharger la musique' : 'Téléchargement verrouillé'}
        </div>
        {!canDownload && upgradeMessage && (
          <div className="text-yellow-300 mt-1">{upgradeMessage}</div>
        )}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black/90"></div>
      </div>
    </div>
  );
}
