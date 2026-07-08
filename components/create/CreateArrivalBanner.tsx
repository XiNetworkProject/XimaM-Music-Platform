'use client';

import { Film, Sparkles, Trophy, UploadCloud, Wand2 } from 'lucide-react';

export type CreateArrivalContext = 'ai' | 'variation' | 'clip' | 'upload' | 'challenge';

const CONTEXT_STYLE: Record<CreateArrivalContext, { icon: typeof Sparkles; color: string; bg: string }> = {
  ai: { icon: Sparkles, color: '#7357C6', bg: 'rgba(115,87,198,0.10)' },
  variation: { icon: Wand2, color: '#4A9EAA', bg: 'rgba(74,158,170,0.12)' },
  clip: { icon: Film, color: '#D96D63', bg: 'rgba(217,109,99,0.10)' },
  upload: { icon: UploadCloud, color: '#C99B48', bg: 'rgba(201,155,72,0.14)' },
  challenge: { icon: Trophy, color: '#D96D63', bg: 'rgba(217,109,99,0.12)' },
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
  const style = CONTEXT_STYLE[context];
  const Icon = style.icon;

  return (
    <div
      className={`inline-flex max-w-full items-center gap-2 rounded-full px-3.5 py-2 text-xs font-black ${className}`}
      style={{ backgroundColor: style.bg, color: style.color }}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{createArrivalLabel(context, title)}</span>
    </div>
  );
}
