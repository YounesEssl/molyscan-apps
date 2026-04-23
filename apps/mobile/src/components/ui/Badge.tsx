import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '@/design/tokens/colors';
import { radius } from '@/design/tokens/radius';
import { spacing } from '@/design/tokens/spacing';
import { typography } from '@/design/tokens/typography';

interface BadgeProps {
  label: string;
  variant?: 'matched' | 'partial' | 'unmatched' | 'pending' | 'ai' | 'offline' | 'success' | 'warning' | 'danger' | 'neutral' | 'primary' | 'custom';
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
  customColor?: string;
  onPress?: () => void;
}

const BADGE_COLORS: Record<string, { color: string }> = {
  matched: { color: colors.matched },
  success: { color: colors.success },
  partial: { color: colors.partial },
  warning: { color: colors.warning },
  unmatched: { color: colors.unmatched },
  danger: { color: colors.error },
  pending: { color: colors.textMuted },
  neutral: { color: colors.textSecondary },
  primary: { color: colors.red },
  ai: { color: '#6366f1' },
  offline: { color: colors.textMuted },
  custom: { color: colors.textSecondary },
};

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'neutral',
  size = 'sm',
  icon,
  customColor,
  onPress,
}) => {
  const badgeColor = customColor ?? BADGE_COLORS[variant]?.color ?? colors.textSecondary;
  const bgColor = badgeColor + '18'; // ~10% opacity
  const borderColor = badgeColor + '40'; // ~25% opacity

  const content = (
    <View style={[styles.badge, size === 'md' && styles.badgeMd, { backgroundColor: bgColor, borderColor }]}>
      {icon && <View style={styles.icon}>{icon}</View>}
      <Text style={[styles.text, size === 'md' && styles.textMd, { color: badgeColor }]}>{label}</Text>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeMd: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm - 2,
  },
  icon: {
    marginRight: -2,
  },
  text: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.displaySemibold,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.wider,
  },
  textMd: {
    fontSize: typography.sizes.sm,
  },
});
