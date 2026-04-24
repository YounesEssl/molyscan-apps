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

const BADGE_COLORS: Record<string, string> = {
  matched:   colors.ok,
  success:   colors.ok,
  partial:   colors.warn,
  warning:   colors.warn,
  unmatched: colors.red,
  danger:    colors.red,
  primary:   colors.red,
  pending:   colors.ink3,
  neutral:   colors.ink2,
  ai:        colors.purple,
  offline:   colors.ink3,
  custom:    colors.ink2,
};

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'neutral',
  size = 'sm',
  icon,
  customColor,
  onPress,
}) => {
  const badgeColor = customColor ?? BADGE_COLORS[variant] ?? colors.ink2;
  const bgColor = badgeColor + '18';
  const borderColor = badgeColor + '40';

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
    fontFamily: typography.fonts.sansSemibold,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  textMd: {
    fontSize: typography.sizes.sm,
  },
});
