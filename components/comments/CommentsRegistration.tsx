'use client';
import dynamic from 'next/dynamic';
import { useContextSurfaceRenderer } from '@/components/context-surfaces/ContextSurfaceController';
const CommentsSurface = dynamic(() => import('./CommentsSurface'), { ssr: false, loading: () => <div className="h-[82dvh] animate-pulse bg-[var(--syn-soft)]" aria-label="Chargement des commentaires" /> });
export default function CommentsRegistration() { useContextSurfaceRenderer('comments', CommentsSurface); return null; }
