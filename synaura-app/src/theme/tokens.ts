export const colors = {
  background: '#F7F6F3',
  backgroundAlt: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceStrong: '#FFFFFF',
  // Rôles sémantiques ajoutés pour la cohérence web/mobile (voir app/globals.css
  // côté web). `text`/`surface`/`border` restent les alias historiques déjà
  // utilisés partout dans l'app — on ajoute les rôles manquants plutôt que de
  // renommer l'existant, pour ne pas casser les écrans déjà alignés.
  surfaceMuted: '#EEECE7',
  elevatedSurface: '#FFFFFF',
  border: 'rgba(17,17,17,0.075)',
  borderStrong: 'rgba(17,17,17,0.14)',
  text: '#111111',
  textSecondary: '#686664',
  textTertiary: '#96928E',
  accent: '#7357C6',
  accent2: '#4A9EAA',
  accentPink: '#C85D82',
  selected: '#7357C6',
  danger: '#D92D20',
  destructive: '#C94F4F',
  success: '#2E9D68',
  black: '#111111',
  white: '#FFFFFF',
  paper: '#FFFFFF',
  coral: '#D96D63',
  cyan: '#4A9EAA',
  violet: '#7357C6',
  pink: '#C85D82',
  gold: '#C99B48',
  playing: '#22C55E',
  dark: '#111111',
  darkSurface: '#1A1918',
  darkSurfaceRaised: '#23211F',
  warmWhite: '#F7F6F3',
  violetSoft: 'rgba(115,87,198,0.11)',
  cyanSoft: 'rgba(74,158,170,0.12)',
  coralSoft: 'rgba(217,109,99,0.12)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 20,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  pill: 999,
};

export const shadows = {
  soft: {
    shadowColor: '#111111',
    shadowOpacity: 0.045,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  floating: {
    shadowColor: '#111111',
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 7 },
    elevation: 6,
  },
};

export const typography = {
  display: 30,
  title: 23,
  subtitle: 17,
  body: 14,
  caption: 12,
  tiny: 10,
};

export const layout = {
  pagePadding: 18,
  contentMaxWidth: 760,
  dockHeight: 66,
};

export const motion = {
  quick: 160,
  standard: 280,
  reveal: 420,
};
