import { useMemo } from 'react';
import { colors as tokens } from '@/theme/tokens';
import { useCollectionPalette } from './CollectionUI';

/** Literal surface colors refresh mounted native forms when the theme changes. */
export function useSurfaceColors() {
  const palette = useCollectionPalette();
  return useMemo(() => ({ ...tokens,
    background: palette.bg, surface: palette.surface,
    surfaceStrong: palette.raised, surfaceMuted: palette.raised,
    elevatedSurface: palette.surface, text: palette.text,
    textSecondary: palette.muted, textTertiary: palette.faint,
    border: palette.line, borderStrong: palette.line, cyan: palette.blue,
  }), [palette]);
}
