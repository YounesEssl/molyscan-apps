import { Platform } from 'react-native';

export const COLORS = {
  // Brand
  primary: '#1B3A5C',
  primaryLight: '#2D5A8E',
  accent: '#E87722',
  accentLight: '#FF9E5E',

  // Backgrounds
  background: '#F1F5F9',
  surface: '#FFFFFF',

  // Text
  text: '#1B3A5C',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',

  // Status
  success: '#10B981',
  successLight: '#ECFDF5',
  warning: '#F59E0B',
  warningLight: '#FFF7ED',
  danger: '#EF4444',
  dangerLight: '#FEF2F2',

  // UI
  muted: '#E2E8F0',
  border: '#E2E8F0',
  overlay: 'rgba(0,0,0,0.5)',

  // Tab bar
  tabBarBackground: '#FFFFFF',
  tabBarActive: '#E87722',
  tabBarInactive: '#94A3B8',
} as const;

export const GRADIENTS = {
  primary: ['#1B3A5C', '#2D5A8E'] as const,
  accent: ['#E87722', '#FF9E5E'] as const,
  card: ['#FFFFFF', '#F8FAFC'] as const,
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
} as const;

export const FONT_SIZE = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 28,
  hero: 32,
} as const;

export const SHADOW = {
  sm: Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
    android: { elevation: 2 },
    default: {},
  }) as Record<string, unknown>,
  md: Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 },
    android: { elevation: 4 },
    default: {},
  }) as Record<string, unknown>,
  lg: Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.12, shadowRadius: 20 },
    android: { elevation: 8 },
    default: {},
  }) as Record<string, unknown>,
  accent: Platform.select({
    ios: { shadowColor: '#E87722', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 12 },
    android: { elevation: 8 },
    default: {},
  }) as Record<string, unknown>,
  primary: Platform.select({
    ios: { shadowColor: '#1B3A5C', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20 },
    android: { elevation: 10 },
    default: {},
  }) as Record<string, unknown>,
};
