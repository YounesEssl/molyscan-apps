import { colors } from '@/design/tokens/colors';
import { shadows } from '@/design/tokens/shadows';
import { radius } from '@/design/tokens/radius';
import { spacing } from '@/design/tokens/spacing';
import { typography } from '@/design/tokens/typography';
// Bridge: map old COLORS keys → new design tokens
// All existing files import these and they still work
export const COLORS: Record<string, string> = {
  primary: colors.red,
  primaryLight: colors.redLight,
  accent: colors.red,
  accentLight: colors.redLight,

  background: colors.background,
  surface: colors.surface,

  text: colors.textPrimary,
  textSecondary: colors.textSecondary,
  textMuted: colors.textMuted,

  success: colors.success,
  successLight: 'rgba(22, 163, 74, 0.10)',
  warning: colors.warning,
  warningLight: 'rgba(217, 119, 6, 0.10)',
  danger: colors.error,
  dangerLight: 'rgba(237, 28, 35, 0.10)',

  muted: colors.surfaceAlt,
  border: colors.border,
  overlay: 'rgba(0,0,0,0.5)',

  tabBarBackground: colors.surface,
  tabBarActive: colors.red,
  tabBarInactive: colors.textMuted,
};

export const GRADIENTS: { primary: [string, string]; accent: [string, string]; card: [string, string] } = {
  primary: [colors.red, colors.redLight],
  accent: [colors.red, colors.redLight],
  card: [colors.surface, colors.surfaceAlt],
};

// Bridge: old SPACING mapped from new tokens
export const SPACING = {
  xs: spacing.xs,
  sm: spacing.sm,
  md: spacing.lg,    // old md=16, new lg=16
  lg: spacing.xxl,   // old lg=24, new xxl=24
  xl: spacing.xxxl,  // old xl=32, new xxxl=32
  xxl: 48,
} as const;

export const RADIUS = {
  sm: radius.sm,
  md: radius.md,
  lg: radius.lg,
  xl: radius.xl,
  xxl: radius.xxl,
  full: radius.pill,
} as const;

export const FONT_SIZE = {
  xs: typography.sizes.xs,
  sm: typography.sizes.sm,
  md: typography.sizes.md,
  lg: typography.sizes.lg,
  xl: typography.sizes.xl,
  xxl: typography.sizes.xxl,
  xxxl: typography.sizes.xxxl,
  hero: typography.sizes.hero,
} as const;

export const SHADOW: Record<string, Record<string, unknown>> = {
  sm: { ...shadows.sm },
  md: { ...shadows.md },
  lg: { ...shadows.lg },
  xl: { ...shadows.xl },
  accent: { ...shadows.red },
  primary: { ...shadows.red },
  red: { ...shadows.red },
  redSm: { ...shadows.redSm },
  none: { ...shadows.none },
};

