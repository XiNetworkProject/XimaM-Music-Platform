import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { useAuth } from '@/auth/AuthProvider';
import { useNativeCalls } from '@/calls/NativeCallProvider';
import { MiniPlayer } from './MiniPlayer';
import { FullPlayerModal } from './FullPlayerModal';

export function NativePlayerChrome({ activeRoute, open, onOpen, onClose }: { activeRoute: string; open: boolean; onOpen: () => void; onClose: () => void }) {
  const auth = useAuth();
  const calls = useNativeCalls();
  const blocked = auth.loading || auth.mfaRequired || auth.biometricLocked || Boolean(auth.user && auth.user.profileComplete === false) || calls.engaged;
  const [modalReady, setModalReady] = useState(false);
  useEffect(() => {
    if (!open || blocked) { setModalReady(false); return; }
    // Android copies the activity's system-bar appearance when creating its
    // modal window. Let the root's light status-bar update reach native first.
    if (Platform.OS !== 'android') { setModalReady(true); return; }
    let secondFrame = 0;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => setModalReady(true));
    });
    return () => { cancelAnimationFrame(firstFrame); cancelAnimationFrame(secondFrame); };
  }, [open, blocked]);
  useEffect(() => { if (blocked && open) onClose(); }, [blocked, open, onClose]);
  if (blocked) return null;
  return <><MiniPlayer activeRoute={activeRoute} onOpen={onOpen} /><FullPlayerModal visible={open && modalReady} onClose={onClose} /></>;
}
