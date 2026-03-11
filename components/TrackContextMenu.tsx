'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  ListPlus,
  ListEnd,
  Share2,
  User,
  Flag,
  FolderPlus,
  MoreHorizontal,
  Link2,
  Check,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAudioPlayer } from '@/app/providers';
import { notify } from '@/components/NotificationCenter';

interface TrackContextMenuProps {
  track: any;
  children?: React.ReactNode;
}

export default function TrackContextMenu({ track }: TrackContextMenuProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();
  const { addToUpNext } = useAudioPlayer();

  const handleClose = useCallback(() => setOpen(false), []);

  const handlePlayNext = () => {
    if (!track) return;
    addToUpNext(track, 'next');
    notify.success('OK', `${track.title || 'Titre'} — sera lu ensuite`);
    handleClose();
  };

  const handleAddToQueue = () => {
    if (!track) return;
    addToUpNext(track, 'end');
    notify.success('OK', `${track.title || 'Titre'} — ajouté à la file`);
    handleClose();
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/track/${track?._id || track?.id || ''}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: track?.title || 'Track', url });
      } catch { /* cancelled */ }
    } else {
      try { await navigator.clipboard.writeText(url); } catch {}
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
    handleClose();
  };

  const handleGoToProfile = () => {
    const username = track?.artist?.username;
    if (username) {
      router.push(`/profile/${encodeURIComponent(username)}`);
    }
    handleClose();
  };

  const handleReport = () => {
    const url = `/support?report=track&id=${track?._id || track?.id || ''}`;
    router.push(url);
    handleClose();
  };

  return (
    <>
      <button
        ref={btnRef}
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); setOpen((v) => !v); }}
        className="p-1 rounded-md hover:bg-white/10 transition text-white/40 hover:text-white"
        aria-label="Options"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      <ContextMenuPortal anchorRef={btnRef} open={open} onClose={handleClose}>
        <MenuItem icon={ListPlus} label="Lire ensuite" onClick={handlePlayNext} />
        <MenuItem icon={ListEnd} label="Ajouter à la file" onClick={handleAddToQueue} />
        <div className="my-1 border-t border-white/[0.06]" />
        <MenuItem icon={FolderPlus} label="Ajouter à une playlist" onClick={() => { handleClose(); }} />
        <MenuItem icon={copied ? Check : Share2} label={copied ? 'Lien copié !' : 'Partager'} onClick={handleShare} />
        {track?.artist?.username && (
          <MenuItem icon={User} label="Voir le profil" onClick={handleGoToProfile} />
        )}
        <div className="my-1 border-t border-white/[0.06]" />
        <MenuItem icon={Flag} label="Signaler" onClick={handleReport} subtle />
      </ContextMenuPortal>
    </>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  subtle,
}: {
  icon: any;
  label: string;
  onClick: () => void;
  subtle?: boolean;
}) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] transition ${
        subtle
          ? 'text-white/30 hover:text-white/50 hover:bg-white/[0.04]'
          : 'text-white/70 hover:text-white hover:bg-white/[0.06]'
      }`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  );
}

function ContextMenuPortal({
  anchorRef,
  open,
  onClose,
  children,
}: {
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!open || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const menuW = 220;
    const menuH = 280;
    let left = rect.right - menuW;
    let top = rect.bottom + 6;
    if (left < 8) left = 8;
    if (left + menuW > window.innerWidth - 8) left = window.innerWidth - menuW - 8;
    if (top + menuH > window.innerHeight - 8) top = rect.top - menuH - 6;
    setPos({ top, left });
  }, [open, anchorRef]);

  useEffect(() => {
    if (!open) return;
    const close = () => onClose();
    const timer = setTimeout(() => document.addEventListener('click', close), 0);
    const escHandler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', escHandler);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', close);
      document.removeEventListener('keydown', escHandler);
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed z-[9999] w-[220px] rounded-xl border border-white/10 bg-[#121218]/98 backdrop-blur-2xl py-1.5 shadow-[0_16px_64px_rgba(0,0,0,.7)] animate-in fade-in-0 zoom-in-95 duration-100"
      style={{ top: pos.top, left: pos.left }}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>,
    document.body,
  );
}
