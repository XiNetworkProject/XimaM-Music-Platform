'use client';

import { motion } from 'framer-motion';

// Skeleton de base animé
export function Skeleton({ className = '', animate = true }: { className?: string; animate?: boolean }) {
  return (
    <div className={`bg-[var(--surface-3)] rounded-lg ${animate ? 'animate-pulse' : ''} ${className}`} />
  );
}

// Skeleton pour une carte de track
export function TrackCardSkeleton() {
  return (
    <div className="panel-suno border border-[var(--border)] rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-3">
        {/* Cover */}
        <Skeleton className="w-16 h-16 rounded-lg flex-shrink-0" />
        
        {/* Info */}
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Skeleton className="w-10 h-10 rounded-full" />
          <Skeleton className="w-10 h-10 rounded-full" />
        </div>
      </div>
    </div>
  );
}

// Skeleton pour liste de tracks
export function TrackListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <TrackCardSkeleton key={i} />
      ))}
    </div>
  );
}

// Skeleton pour carte artiste
export function ArtistCardSkeleton() {
  return (
    <div className="panel-suno border border-[var(--border)] rounded-xl p-6 text-center space-y-4">
      {/* Avatar */}
      <Skeleton className="w-24 h-24 rounded-full mx-auto" />
      
      {/* Nom */}
      <Skeleton className="h-5 w-2/3 mx-auto" />
      
      {/* Stats */}
      <div className="flex justify-center gap-4">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-16" />
      </div>

      {/* Bouton */}
      <Skeleton className="h-10 w-full rounded-full" />
    </div>
  );
}

// Skeleton pour grille d'artistes
export function ArtistGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <ArtistCardSkeleton key={i} />
      ))}
    </div>
  );
}

// Skeleton pour carte playlist
export function PlaylistCardSkeleton() {
  return (
    <div className="panel-suno border border-[var(--border)] rounded-xl overflow-hidden">
      {/* Cover */}
      <Skeleton className="w-full aspect-square" />
      
      {/* Info */}
      <div className="p-4 space-y-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );
}

// Skeleton pour grille playlists
export function PlaylistGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <PlaylistCardSkeleton key={i} />
      ))}
    </div>
  );
}

// Skeleton pour profil utilisateur
export function ProfileHeaderSkeleton() {
  return (
    <div className="panel-suno border border-[var(--border)] rounded-xl p-6">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Avatar */}
        <Skeleton className="w-32 h-32 rounded-full" />
        
        {/* Info */}
        <div className="flex-1 space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-5 w-32" />
          </div>
          
          {/* Stats */}
          <div className="flex gap-6">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-24" />
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Skeleton className="h-10 w-32 rounded-full" />
            <Skeleton className="h-10 w-32 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Skeleton pour commentaire
export function CommentSkeleton() {
  return (
    <div className="flex gap-3 p-4 border-b border-[var(--border)]">
      <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
      
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-24 mt-2" />
      </div>
    </div>
  );
}

// Skeleton pour liste commentaires
export function CommentsListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div>
      {Array.from({ length: count }).map((_, i) => (
        <CommentSkeleton key={i} />
      ))}
    </div>
  );
}

// Skeleton pour stats
export function StatsCardSkeleton() {
  return (
    <div className="panel-suno border border-[var(--border)] rounded-xl p-6 text-center space-y-3">
      <Skeleton className="w-12 h-12 rounded-full mx-auto" />
      <Skeleton className="h-8 w-24 mx-auto" />
      <Skeleton className="h-4 w-32 mx-auto" />
    </div>
  );
}

// Skeleton pour grille stats
export function StatsGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <StatsCardSkeleton key={i} />
      ))}
    </div>
  );
}

// Skeleton pour message
export function MessageSkeleton() {
  return (
    <div className="flex gap-3 p-4 hover:bg-[var(--surface-2)] rounded-lg">
      <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
      
      <div className="flex-1 space-y-2">
        <div className="flex justify-between">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-4 w-full" />
      </div>
    </div>
  );
}

// Skeleton pour liste messages
export function MessagesListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <MessageSkeleton key={i} />
      ))}
    </div>
  );
}

// Skeleton page complète (générique)
export function PageSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-6 w-96" />
      </div>

      {/* Stats */}
      <StatsGridSkeleton />

      {/* Contenu principal */}
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <TrackListSkeleton />
      </div>
    </div>
  );
}

// Loading Overlay avec blur
export function LoadingOverlay({ message = 'Chargement...' }: { message?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/50 backdrop-blur-sm"
    >
      <div className="panel-suno border border-[var(--border)] rounded-xl p-8 text-center space-y-4">
        <div className="w-12 h-12 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-[var(--text)] font-medium">{message}</p>
      </div>
    </motion.div>
  );
}

// Empty State
export function EmptyState({
  icon,
  title,
  description,
  cta,
  onCtaClick,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  cta?: string;
  onCtaClick?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {icon && (
        <div className="w-16 h-16 rounded-full bg-[var(--surface-3)] flex items-center justify-center mb-4 text-[var(--text-muted)]">
          {icon}
        </div>
      )}
      
      <h3 className="text-xl font-semibold text-[var(--text)] mb-2">
        {title}
      </h3>
      
      {description && (
        <p className="text-[var(--text-muted)] mb-6 max-w-md">
          {description}
        </p>
      )}

      {cta && onCtaClick && (
        <button
          onClick={onCtaClick}
          className="px-6 py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-medium rounded-full transition-colors"
        >
          {cta}
        </button>
      )}
    </div>
  );
}

