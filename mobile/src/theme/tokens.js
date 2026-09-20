/**
 * SINGLE SOURCE OF TRUTH for the mobile app's design tokens - colors,
 * typography, spacing. Every screen/component should read from here via
 * useTheme() rather than hardcoding hex values or pixel numbers, so the
 * whole app can be restyled (or a future third theme added) in one place.
 * Values are chosen to match the web app's palette so both platforms look
 * like the same product.
 */

export const lightColors = {
  canvas: '#F5F6F2',
  surface: '#FFFFFF',
  ink: '#1B1F23',
  inkMuted: '#8A8578',
  teal: '#0F6B5C',
  tealDark: '#0B4F44',
  tealLight: '#E4F0EC',
  gold: '#C98A2C',
  goldLight: '#FBF0DD',
  line: '#DDD9CF',
  primary: '#0F6B5C', // fixed brand color for solid buttons, same in both themes for contrast
  danger: '#DC2626',
  overlay: 'rgba(27,31,35,0.85)',
};

export const darkColors = {
  canvas: '#121517',
  surface: '#1E2225',
  ink: '#EAE8E2',
  inkMuted: '#9A968C',
  teal: '#3EB39C',
  tealDark: '#288A77',
  tealLight: '#16302B',
  gold: '#E0AB4F',
  goldLight: '#332914',
  line: '#383D41',
  primary: '#0F6B5C',
  danger: '#F87171',
  overlay: 'rgba(0,0,0,0.7)',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const typography = {
  display: { fontSize: 24, fontWeight: '700' },
  heading: { fontSize: 20, fontWeight: '600' },
  body: { fontSize: 14, fontWeight: '400' },
  caption: { fontSize: 12, fontWeight: '400' },
};

export const radii = { sm: 8, md: 12, full: 999 };
