import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { MusicClip } from '@/api/types';
import { ProfileClipCard } from '@/components/profile/ProfileClipCard';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';

const GAP = 10;

export function ProfileClipGrid({
  clips,
  owner = false,
  maxItems,
  onOpen,
  onManage,
}: {
  clips: MusicClip[];
  owner?: boolean;
  maxItems?: number;
  onOpen: (clip: MusicClip) => void;
  onManage?: (clip: MusicClip) => void;
}) {
  const responsive = useResponsiveLayout();
  const [measuredWidth, setMeasuredWidth] = useState(0);
  const items = typeof maxItems === 'number' ? clips.slice(0, maxItems) : clips;
  const availableWidth = measuredWidth || responsive.availableContentWidth;

  const layout = useMemo(() => {
    const maxColumns = responsive.isTablet ? 4 : responsive.isPhoneLandscape ? 3 : 2;
    const minimumCardWidth = responsive.isTablet ? 158 : 124;
    const fittingColumns = Math.max(1, Math.floor((availableWidth + GAP) / (minimumCardWidth + GAP)));
    const columns = Math.min(maxColumns, fittingColumns);
    const width = Math.max(1, Math.floor((availableWidth - GAP * (columns - 1)) / columns));
    return { width, height: Math.round(width * 16 / 9) };
  }, [availableWidth, responsive.isPhoneLandscape, responsive.isTablet]);

  return (
    <View
      onLayout={(event) => {
        const nextWidth = Math.floor(event.nativeEvent.layout.width);
        if (nextWidth > 0 && Math.abs(nextWidth - measuredWidth) > 1) setMeasuredWidth(nextWidth);
      }}
      style={styles.grid}
    >
      {items.map((clip) => (
        <ProfileClipCard
          key={clip.id}
          clip={clip}
          owner={owner}
          style={{ width: layout.width, height: layout.height }}
          onPress={() => onOpen(clip)}
          onManage={onManage ? () => onManage(clip) : undefined}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: GAP },
});
