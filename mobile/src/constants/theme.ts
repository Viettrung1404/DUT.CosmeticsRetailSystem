export const COLORS = {
  // Brand & Primary
  primary: '#C85A70',               // Rose Berry (Màu chủ đạo)
  primaryDeep: '#9D394F',           // Deep Rose Berry
  primaryFixed: '#FFD9DD',          // Light Pink badge/highlight
  primaryFixedDim: '#FFB2BD',

  // Secondary & Accents
  secondary: '#9D8177',             // Dusty Nude (Trầm ấm)
  secondaryContainer: '#FAD9CD',     // Nhãn đơn vị vận chuyển / badge phụ
  tertiary: '#7069EE',              // Modern Purple Accent
  tertiaryFixed: '#E3DFFF',

  // Surfaces & Backgrounds
  background: '#F9ECEE',            // Soft Blush Pink Canvas
  backgroundCanvas: '#F9ECEE',
  surface: '#FFF8F6',               // Warm Paper White
  surfaceCard: '#FFFFFF',           // Pure White Card
  surfaceSubtle: '#FEFAFC',         // Off-White Pink Container
  surfaceContainer: '#FFE9E2',      // Image & Input container
  surfaceContainerLow: '#FFF1EC',

  // Typography Colors
  textDark: '#412E27',              // Deep Espresso
  textPrimary: '#281811',           // On-surface
  textSecondary: '#554244',
  textMuted: '#AD9F9C',             // Warm Gray

  // Borders & Feedback
  border: '#EFE5E7',                // Soft Pink Border
  borderSubtle: '#EFE5E7',
  success: '#4CAF50',
  error: '#BA1A1A',
  errorContainer: '#FFDAD6',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 40,
};

export const ROUNDED = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 24,
  full: 9999,
};

export const SHADOWS = {
  soft: {
    shadowColor: '#C85A70',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  card: {
    shadowColor: '#C85A70',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  elevated: {
    shadowColor: '#C85A70',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 6,
  },
};

// Đối tượng theme chính dùng xuyên suốt toàn bộ ứng dụng Mobile
export const theme = {
  colors: COLORS,
  spacing: SPACING,
  rounded: ROUNDED,
  shadows: SHADOWS,
};

export default theme;