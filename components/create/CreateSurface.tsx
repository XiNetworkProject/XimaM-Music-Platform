'use client';

import { useId } from 'react';
import { ArrowUpRight, Film, ListMusic, MessageCircle, Image, Music2, Sparkles, UploadCloud, Users } from 'lucide-react';
import Link from '@/components/navigation/HandoffLink';
import ExperienceMotionFrame from '@/components/ambient/ExperienceMotionFrame';
import type { ContextSurfaceRendererProps } from '@/components/context-surfaces/ContextSurfaceController';
import { SynauraOverlayTitle, SynauraOverlayDescription } from '@/components/ui/SynauraOverlay';
import { CREATE_TOOLS, CREATE_OTHER_TOOLS, withCreateSurfaceContext } from '@/lib/createSurface';
import './create-surface.css';

const icons = { post: MessageCircle, ai: Sparkles, upload: UploadCloud, clip: Film, collab: Users };

/** A small, resolution-independent light ribbon; no canvas, timer or media state. */
function CreationLight() {
  const id = useId();
  return <svg className="create-sheet-light" viewBox="0 0 360 200" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#173b80" stopOpacity="0" />
        <stop offset=".35" stopColor="#5487ff" />
        <stop offset=".55" stopColor="#d3e2ff" />
        <stop offset=".72" stopColor="#5074f4" />
        <stop offset="1" stopColor="#253872" stopOpacity="0" />
      </linearGradient>
    </defs>
    {Array.from({ length: 21 }, (_, index) => <path key={index}
      d={`M ${-30 + index * 4} ${154 + index * 3} C ${105 + index * 2} ${200 - index * 7}, ${90 + index * 5} ${-58 + index * 3}, ${192 + index * 4} ${43 + index * 3} S ${283 + index * 2} ${162 - index * 3}, 390 ${10 + index * 5}`}
      fill="none" stroke={`url(#${id})`} strokeWidth={index % 5 === 0 ? 1.5 : .65} opacity={.42 + index % 4 * .13} />)}
  </svg>;
}

export default function CreateSurface({ entry }: ContextSurfaceRendererProps) {
  const href = (value: string) => withCreateSurfaceContext(value, entry);
  return <ExperienceMotionFrame className="create-sheet">
    <div className="create-sheet-handle" aria-hidden="true" />
    <header className="create-sheet-header" tabIndex={-1} data-context-surface-initial-focus>
      <span className="create-sheet-eyebrow"><span aria-hidden="true" />À VOUS DE JOUER</span>
      <SynauraOverlayTitle>Ça commence par <em>vous.</em></SynauraOverlayTitle>
      <SynauraOverlayDescription>{entry.entityId ? 'Choisissez comment participer au défi.' : 'Un post, un morceau, un moment à partager.'}</SynauraOverlayDescription>
    </header>
    <div className="create-sheet-scroll">
      <div className="create-sheet-tools">
        {CREATE_TOOLS.map(tool => {
          const Icon = icons[tool.id];
          // Replacing the transient history entry makes Back return to the background,
          // not to an empty /create page. Modified clicks retain native link behavior.
          return <Link key={tool.id} replace prefetch={false} data-live-route-intent href={href(tool.href)} className={`create-sheet-tool create-sheet-tool-${tool.id}`} aria-labelledby={`create-tool-${tool.id}`}>
            {tool.id === 'ai' ? <CreationLight /> : null}
            {tool.id === 'post' && <span className="create-sheet-post-art" aria-hidden="true"><MessageCircle/><Image/><Music2/></span>}
            <span className="create-sheet-icon"><Icon size={23} strokeWidth={1.6} aria-hidden="true" /></span>
            <span className="create-sheet-tool-copy"><strong id={`create-tool-${tool.id}`}>{tool.title}</strong><small>{tool.description}</small>{tool.id === 'post' && <span className="create-sheet-formats">Texte · Photos · Musique</span>}</span>
            <ArrowUpRight className="create-sheet-arrow" size={18} aria-hidden="true" />
          </Link>;
        })}
      </div>
      <nav className="create-sheet-more" aria-label="Créer ensemble"><span>Faire grandir une idée</span><div>{CREATE_OTHER_TOOLS.map(tool => <Link key={tool.id} replace prefetch={false} data-live-route-intent href={href(tool.href)}>{tool.title}<ArrowUpRight size={15} aria-hidden="true" /></Link>)}</div></nav>
      <footer className="create-sheet-footer"><Link replace prefetch={false} data-live-route-intent href={href('/posts')} className="create-sheet-library"><MessageCircle size={18} aria-hidden="true" /><span>Découvrir les posts</span><ArrowUpRight size={17} aria-hidden="true" /></Link><Link replace prefetch={false} data-live-route-intent href={href('/ai-library')} className="create-sheet-library"><ListMusic size={18} aria-hidden="true" /><span>Mes créations IA</span><ArrowUpRight size={17} aria-hidden="true" /></Link></footer>
    </div>
  </ExperienceMotionFrame>;
}
