export const COLORS = {
  // Primary Dark Palette
  background: '#0B0F19',
  cardBg: '#161F33',
  cardBgElevated: '#1E293B',
  border: '#2A364F',
  borderLight: '#334155',

  // Accent Colors (CamScanner Inspired Vibrant Teal / Emerald)
  primary: '#0D9488',
  primaryLight: '#14B8A6',
  primaryDark: '#0F766E',
  primaryGlow: 'rgba(20, 184, 166, 0.15)',

  // Secondary Accents
  accentBlue: '#3B82F6',
  accentPurple: '#8B5CF6',
  accentOrange: '#F97316',
  accentRed: '#EF4444',
  accentGreen: '#10B981',

  // Neutral Text Colors
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',

  // Overlay / Glass
  glassOverlay: 'rgba(15, 23, 42, 0.85)',
  modalOverlay: 'rgba(0, 0, 0, 0.75)',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const RADIUS = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  full: 9999,
};

export const FILTER_PRESETS = [
  { id: 'original', label: 'Original', icon: 'image-outline' },
  { id: 'magic_color', label: 'Magic Color', icon: 'color-filter-outline' },
  { id: 'grayscale', label: 'Escala Grises', icon: 'contrast-outline' },
  { id: 'bw_contrast', label: 'B&W Contraste', icon: 'aperture-outline' },
] as const;

export const DEFAULT_PDF_SETTINGS = {
  pageSize: 'A4' as const,
  orientation: 'portrait' as const,
  margin: 'none' as const,
  quality: 0.85,
  documentTitle: 'CamScan_LibreDoc',
  compressImages: true,
};
