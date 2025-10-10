'use client';

interface AvatarProps {
  src?: string | null | undefined;
  name?: string;
  username?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
}

// Générer une couleur basée sur le nom (toujours la même pour un même nom)
function getColorFromName(name: string): string {
  if (!name) return '#8B5CF6'; // violet par défaut
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const colors = [
    '#8B5CF6', // violet
    '#EC4899', // rose
    '#F59E0B', // orange
    '#10B981', // vert
    '#3B82F6', // bleu
    '#EF4444', // rouge
    '#06B6D4', // cyan
    '#6366F1', // indigo
    '#F97316', // orange foncé
    '#14B8A6', // teal
    '#A855F7', // purple
    '#84CC16', // lime
  ];
  
  return colors[Math.abs(hash) % colors.length];
}

export default function Avatar({ src, name, username, size = 'md', className = '' }: AvatarProps) {
  const displayName = name || username || '?';
  const initial = displayName.charAt(0).toUpperCase();
  const bgColor = getColorFromName(displayName);
  
  const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-xl',
    '2xl': 'w-20 h-20 text-2xl',
  };
  
  if (src) {
    return (
      <img
        src={src}
        alt={displayName}
        className={`${sizeClasses[size]} rounded-full object-cover ${className}`}
        onError={(e) => {
          // Si l'image échoue, afficher le fallback
          const target = e.currentTarget as HTMLImageElement;
          target.style.display = 'none';
          if (target.nextElementSibling) {
            (target.nextElementSibling as HTMLElement).style.display = 'flex';
          }
        }}
      />
    );
  }
  
  return (
    <div
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-semibold text-white ${className}`}
      style={{ backgroundColor: bgColor }}
    >
      {initial}
    </div>
  );
}

