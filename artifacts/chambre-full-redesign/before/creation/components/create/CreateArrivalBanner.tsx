'use client';

import { Film, Sparkles, Trophy, UploadCloud, Wand2 } from 'lucide-react';

export type CreateArrivalContext = 'ai' | 'variation' | 'clip' | 'upload' | 'challenge';

const CONTEXT_ICON: Record<CreateArrivalContext, typeof Sparkles> = {
  ai: Sparkles,
  variation: Wand2,
  clip: Film,
  upload: UploadCloud,
  challenge: Trophy,
};

export function createArrivalLabel(context: CreateArrivalContext, title?: string | null) {
  if (context === 'variation') return title ? `Variation inspirée de ${title}` : 'Créer une variation';
  if (context === 'clip') return title ? `Clip utilisant ${title}` : 'Publier un Clip';
  if (context === 'upload') return 'Publier un morceau';
  if (context === 'challenge') return title ? `Défi : ${title}` : 'Participer à un défi';
  return "Créer avec l'IA";
}

export default function CreateArrivalBanner({
  context,
  title,
  className = '',
}: {
  context: CreateArrivalContext;
  title?: string | null;
  className?: string;
}) {
  const Icon = CONTEXT_ICON[context];

  return (
    <div
      className={`v2-arrival ${className}`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{createArrivalLabel(context, title)}</span>
    </div>
  );
}
