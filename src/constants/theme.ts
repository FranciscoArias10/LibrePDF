export type ThemeColors = {
  background: string;
  cardBg: string;
  cardBgElevated: string;
  border: string;
  borderLight: string;
  primary: string;
  primaryLight: string;
  primaryDark: string;
  primaryGlow: string;
  secondary: string;
  secondaryDark: string;
  secondaryGlow: string;
  accentBlue: string;
  accentPurple: string;
  accentOrange: string;
  accentRed: string;
  accentGreen: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  glassOverlay: string;
  modalOverlay: string;
};

export const darkTheme: ThemeColors = {
  background: '#000000',
  cardBg: '#09090B',
  cardBgElevated: '#18181B',
  border: '#27272A',
  borderLight: '#3F3F46',
  primary: '#FF003C',
  primaryLight: '#FF3366',
  primaryDark: '#CC0030',
  primaryGlow: 'rgba(255, 0, 60, 0.15)',
  secondary: '#00E5FF',
  secondaryDark: '#00B2CC',
  secondaryGlow: 'rgba(0, 229, 255, 0.15)',
  accentBlue: '#3B82F6',
  accentPurple: '#8B5CF6',
  accentOrange: '#F97316',
  accentRed: '#EF4444',
  accentGreen: '#10B981',
  textPrimary: '#FAFAFA',
  textSecondary: '#A1A1AA',
  textMuted: '#71717A',
  glassOverlay: 'rgba(0, 0, 0, 0.85)',
  modalOverlay: 'rgba(0, 0, 0, 0.90)',
};

export const lightTheme: ThemeColors = {
  background: '#F8FAFC', // Slate 50
  cardBg: '#FFFFFF', // Pure White
  cardBgElevated: '#F1F5F9', // Slate 100
  border: '#E2E8F0', // Slate 200
  borderLight: '#CBD5E1', // Slate 300
  primary: '#FF003C', // Keep Red as primary
  primaryLight: '#FF3366',
  primaryDark: '#CC0030',
  primaryGlow: 'rgba(255, 0, 60, 0.15)',
  secondary: '#00E5FF', // Keep Cyan
  secondaryDark: '#00B2CC',
  secondaryGlow: 'rgba(0, 229, 255, 0.15)',
  accentBlue: '#3B82F6',
  accentPurple: '#8B5CF6',
  accentOrange: '#F97316',
  accentRed: '#EF4444',
  accentGreen: '#10B981',
  textPrimary: '#0F172A', // Slate 900
  textSecondary: '#475569', // Slate 600
  textMuted: '#94A3B8', // Slate 400
  glassOverlay: 'rgba(255, 255, 255, 0.85)',
  modalOverlay: 'rgba(15, 23, 42, 0.60)', // Darker overlay for contrast
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
