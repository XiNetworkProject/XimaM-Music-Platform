import { useMemo } from 'react';
import { colors as tokens } from '@/theme/tokens';
import { useCollectionPalette } from '@/components/mobile/CollectionUI';

/** Literal semantic colors also refresh mounted conversations on a theme change. */
export function useMessagingColors() {
  const palette = useCollectionPalette();
  return useMemo(() => ({
    ...tokens,
    background: palette.bg,
    surface: palette.surface,
    surfaceStrong: palette.raised,
    surfaceMuted: palette.raised,
    elevatedSurface: palette.surface,
    text: palette.text,
    textSecondary: palette.muted,
    textTertiary: palette.faint,
    border: palette.line,
    borderStrong: palette.line,
    cyan: palette.blue,
  }), [palette]);
}
