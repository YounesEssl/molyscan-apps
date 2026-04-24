import { colors } from '@/design/tokens/colors';
import { shadows } from '@/design/tokens/shadows';
import { radius } from '@/design/tokens/radius';
import { spacing } from '@/design/tokens/spacing';
import { typography } from '@/design/tokens/typography';

export const COLORS: Record<string, string> = {
  primary:      colors.red,
  primaryLight: colors.redVivid,
  accent:       colors.red,
  accentLight:  colors.redVivid,

  background:  colors.paper1,
  surface:     colors.paper2,
  surfaceAlt:  colors.paperWarm,

  text:          colors.ink,
  textSecondary: colors.ink2,
  textMuted:     colors.ink3,

  success:      colors.ok,
  successLight: colors.okBg,
  warning:      colors.warn,
  warningLight: colors.warnBg,
  danger:       colors.red,
  dangerLight:  colors.redSoft,

  muted:   colors.paperWarm,
  border:  colors.ink4,
  overlay: 'rgba(26,20,16,0.5)',

  tabBarBackground: colors.paper2,
  tabBarActive:     colors.ink,
  tabBarInactive:   colors.ink3,
};

export const GRADIENTS: { primary: [string, string]; accent: [string, string]; card: [string, string] } = {
  primary: [colors.redVivid, colors.red],
  accent:  [colors.redVivid, colors.red],
  card:    [colors.paper2, colors.paperWarm],
};

export const SPACING = {
  xs:  spacing.xs,
  sm:  spacing.sm,
  md:  spacing.lg,
  lg:  spacing.lg,
  xl:  spacing.xxl,
  xxl: spacing.xxxl,
} as const;

export const RADIUS = {
  sm:   radius.sm,
  md:   radius.md,
  lg:   radius.lg,
  xl:   radius.xl,
  xxl:  radius.xxl,
  full: radius.pill,
} as const;

export const FONT_SIZE = {
  xs:   typography.sizes.xs,
  sm:   typography.sizes.sm,
  md:   typography.sizes.md,
  lg:   typography.sizes.lg,
  xl:   typography.sizes.xl,
  xxl:  typography.sizes.xxl,
  xxxl: typography.sizes.xxxl,
  hero: typography.sizes.hero,
} as const;

export const SHADOW: Record<string, Record<string, unknown>> = {
  sm:     { ...shadows.sm },
  md:     { ...shadows.md },
  lg:     { ...shadows.lg },
  xl:     { ...shadows.xl },
  accent: { ...shadows.red },
  primary: { ...shadows.red },
  red:    { ...shadows.red },
  redSm:  { ...shadows.redSm },
  none:   { ...shadows.none },
};
