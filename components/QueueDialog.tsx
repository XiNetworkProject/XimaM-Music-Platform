'use client';
import { useEffect, useRef } from 'react';
import { useTrackActions } from '@/components/actions/useTrackActions';
import { useContextSurfaceController } from '@/components/context-surfaces/ContextSurfaceController';
export default function QueueDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const actions = useTrackActions();
  const { current } = useContextSurfaceController();
  const opened = useRef(false);
  const seen = useRef(false);
  useEffect(() => {
    if (isOpen && !opened.current) { opened.current = true; seen.current = false; actions.open(null, 'queue'); }
    else if (!isOpen) opened.current = false;
  }, [isOpen, actions.open]);
  useEffect(() => {
    if (current?.surface === 'queue') seen.current = true;
    if (opened.current && seen.current && isOpen && !current) { opened.current = false; onClose(); }
  }, [current, isOpen, onClose]);
  return null;
}
