import React from 'react';
import { API_BASE_URL } from '@/api/client';
import type { MusicClip } from '@/api/types';
import { EntityShareSheet } from '@/components/sharing/EntityShareSheet';

export function ClipShareSheet({ visible, clip, onClose }: { visible: boolean; clip: MusicClip | null; onClose: () => void }) {
  const clipUrl = clip ? `${API_BASE_URL}/clips/${encodeURIComponent(clip.id)}` : '';
  const creator = clip?.creator.name || clip?.creator.username || 'Créateur Synaura';
  return (
    <EntityShareSheet
      visible={visible && Boolean(clip)}
      title={clip?.caption || `Clip de ${creator}`}
      subtitle={clip ? `${clip.sourceTrack.title} · ${creator}` : undefined}
      kindLabel="Clip"
      url={clipUrl}
      imageUrl={clip ? `${clipUrl}/opengraph-image` : null}
      fileKey={`clip-${clip?.id || 'synaura'}`}
      onClose={onClose}
    />
  );
}
