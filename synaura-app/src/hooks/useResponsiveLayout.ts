import { useMemo } from 'react';
import { useWindowDimensions, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PHONE_CONTENT_MAX_WIDTH = 520;
const TABLET_CONTENT_MAX_WIDTH = 840;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function useResponsiveLayout() {
  const window = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const width = Math.max(1, window.width);
  const height = Math.max(1, window.height);
  const safeWidth = Math.max(1, width - insets.left - insets.right);
  const usableHeight = Math.max(1, height - insets.top - insets.bottom);
  const shortestSide = Math.min(width, height);
  const isLandscape = width > height;
  const isTablet = shortestSide >= 600 || (width >= 700 && height >= 500);
  const isNarrow = width < 360;
  const isCompact = width < 390;
  const isShort = usableHeight < 660;
  const isVeryShort = usableHeight < 560;
  const hasLargeText = window.fontScale > 1.12;
  const compactControls = isNarrow || isShort || hasLargeText;

  const gutter = isNarrow ? 12 : isCompact ? 16 : isTablet ? 24 : 18;
  const contentMaxWidth = isTablet ? TABLET_CONTENT_MAX_WIDTH : PHONE_CONTENT_MAX_WIDTH;
  const pagePaddingLeft = gutter + insets.left;
  const pagePaddingRight = gutter + insets.right;
  const availableContentWidth = Math.max(1, Math.min(safeWidth, contentMaxWidth) - gutter * 2);
  const dockHeight = compactControls ? 62 : 66;
  const sheetMaxWidth = 680;
  const overlayWidth = Math.min(safeWidth, sheetMaxWidth);
  const overlaySideInset = Math.max(0, (safeWidth - overlayWidth) / 2);
  const overlayLeftInset = insets.left + overlaySideInset;
  const overlayRightInset = insets.right + overlaySideInset;
  const bottomDockClearance = dockHeight + Math.max(insets.bottom, 7) + 16;
  const miniPlayerClearance = bottomDockClearance + 68;
  const mediaSize = clamp(
    Math.min(availableContentWidth, usableHeight * (isLandscape ? 0.48 : 0.43)),
    isVeryShort ? 132 : 156,
    isTablet ? 420 : 360,
  );

  const contentFrame = useMemo<ViewStyle>(() => ({
    width: '100%',
    maxWidth: contentMaxWidth,
    alignSelf: 'center',
  }), [contentMaxWidth]);

  const pageContent = useMemo<ViewStyle>(() => ({
    ...contentFrame,
    paddingLeft: pagePaddingLeft,
    paddingRight: pagePaddingRight,
  }), [contentFrame, pagePaddingLeft, pagePaddingRight]);

  return {
    width,
    safeWidth,
    height,
    usableHeight,
    fontScale: window.fontScale,
    insets,
    isLandscape,
    isTablet,
    isNarrow,
    isCompact,
    isShort,
    isVeryShort,
    hasLargeText,
    compactControls,
    gutter,
    pagePaddingLeft,
    pagePaddingRight,
    contentMaxWidth,
    availableContentWidth,
    dockHeight,
    sheetMaxWidth,
    overlaySideInset,
    overlayLeftInset,
    overlayRightInset,
    bottomDockClearance,
    miniPlayerClearance,
    mediaSize,
    contentFrame,
    pageContent,
  };
}
