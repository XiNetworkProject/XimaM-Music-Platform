import { Appearance, DynamicColorIOS, Platform, PlatformColor } from 'react-native';

type SemanticColorName =
  | 'synaura_background'
  | 'synaura_background_alt'
  | 'synaura_surface'
  | 'synaura_surface_strong'
  | 'synaura_surface_muted'
  | 'synaura_elevated_surface'
  | 'synaura_border'
  | 'synaura_border_strong'
  | 'synaura_text'
  | 'synaura_text_secondary'
  | 'synaura_text_tertiary'
  | 'synaura_glass_light'
  | 'synaura_glass_dark';

// React Native accepte les couleurs dynamiques comme ColorValue. Le cast garde
// les consommateurs historiques (gradients, props custom) compatibles sans
// dupliquer un theme dans chaque StyleSheet.
function semanticColor(name: SemanticColorName, light: string, dark: string): string {
  if (Platform.OS === 'android') return PlatformColor(`@color/${name}`) as unknown as string;
  if (Platform.OS === 'ios') return DynamicColorIOS({ light, dark }) as unknown as string;
  return Appearance.getColorScheme() === 'light' ? light : dark;
}

export const colors = {
  background: semanticColor('synaura_background', '#F7F6F3', '#0D0D0D'),
  backgroundAlt: semanticColor('synaura_background_alt', '#EFEEE9', '#080909'),
  surface: semanticColor('synaura_surface', '#FFFFFF', '#151515'),
  surfaceStrong: semanticColor('synaura_surface_strong', '#F1EFEA', '#1C1C1C'),
  surfaceMuted: semanticColor('synaura_surface_muted', '#E7E4DE', '#242424'),
  elevatedSurface: semanticColor('synaura_elevated_surface', '#FFFFFF', '#202020'),
  border: semanticColor('synaura_border', '#16111111', '#14F7F6F3'),
  borderStrong: semanticColor('synaura_border_strong', '#2B111111', '#29F7F6F3'),
  text: semanticColor('synaura_text', '#111111', '#F7F6F3'),
  textSecondary: semanticColor('synaura_text_secondary', '#AD111111', '#ADF7F6F3'),
  textTertiary: semanticColor('synaura_text_tertiary', '#73111111', '#70F7F6F3'),
  accent: '#7357C6',
  accent2: '#4A9EAA',
  accentPink: '#C85D82',
  selected: '#7357C6',
  danger: '#D92D20',
  destructive: '#C94F4F',
  success: '#2E8C62',
  black: '#000000',
  white: '#F7F6F3',
  paper: '#F7F6F3',
  coral: '#D96D63',
  cyan: '#4A9EAA',
  violet: '#7357C6',
  pink: '#C85D82',
  gold: '#B88B3B',
  playing: '#4A9EAA',
  dark: '#0D0D0D',
  darkSurface: '#151515',
  darkSurfaceRaised: '#1C1C1C',
  night: '#0D0D0D',
  nightMuted: '#151515',
  warmWhite: '#F7F6F3',
  violetSoft: 'rgba(115,87,198,0.12)',
  cyanSoft: 'rgba(74,158,170,0.13)',
  coralSoft: 'rgba(217,109,99,0.13)',
  glassLight: semanticColor('synaura_glass_light', '#F5FFFFFF', '#F5151515'),
  glassDark: semanticColor('synaura_glass_dark', '#F5F7F6F3', '#F00D0D0D'),
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 18,
  xl: 24,
  xxl: 34,
  section: 42,
};

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 24,
  pill: 999,
};

export const shadows = {
  soft: {
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  floating: {
    shadowColor: '#000000',
    shadowOpacity: 0.32,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
};

export const typography = {
  display: 32,
  title: 27,
  subtitle: 18,
  body: 15,
  caption: 12,
  tiny: 10,
};

export const layout = {
  pagePadding: 18,
  contentMaxWidth: 760,
  dockHeight: 70,
};

export const motion = {
  instant: 110,
  quick: 170,
  standard: 280,
  reveal: 380,
  expressive: 520,
};
