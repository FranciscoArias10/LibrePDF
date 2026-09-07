export const COLORS = {
  // Primary Dark Palette (Minimalist OLED Black)
  background: '#000000',
  cardBg: '#09090B',
  cardBgElevated: '#18181B',
  border: '#27272A',
  borderLight: '#3F3F46',

  // Accent Colors (Futuristic Neon Red)
  primary: '#FF003C',
  primaryLight: '#FF3366',
  primaryDark: '#CC0030',
  primaryGlow: 'rgba(255, 0, 60, 0.15)',

  // Secondary Accents
  accentBlue: '#3B82F6',
  accentPurple: '#8B5CF6',
  accentOrange: '#F97316',
  accentRed: '#EF4444',
  accentGreen: '#10B981',

  // Neutral Text Colors
  textPrimary: '#FAFAFA',
  textSecondary: '#A1A1AA',
  textMuted: '#71717A',

  // Overlay / Glass
  glassOverlay: 'rgba(0, 0, 0, 0.85)',
  modalOverlay: 'rgba(0, 0, 0, 0.90)',
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
  documentTitle: 'LibrePDF_Doc',
  compressImages: true,
};
