import React from 'react';
import { View, type ViewStyle } from 'react-native';
import { Text } from '@/components/ui';
import { colors } from '@/design/tokens/colors';
import { shadows } from '@/design/tokens/shadows';
import { radius } from '@/design/tokens/radius';
import { spacing } from '@/design/tokens/spacing';
import { typography } from '@/design/tokens/typography';
import { StyleSheet } from 'react-native';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  color?: string;
  trend?: { value: number; direction: 'up' | 'down' };
  style?: ViewStyle;
}

export const StatCard: React.FC<StatCardProps> = ({
  icon,
  label,
  value,
  color = colors.red,
  trend,
  style,
}) => {
  return (
    <View style={[styles.card, style]}>
      <View style={[styles.iconWrapper, { backgroundColor: color + '15' }]}>
        {icon}
      </View>
      <Text variant="label" style={styles.label}>
        {label}
      </Text>
      <Text variant="heading" style={styles.value}>
        {value}
      </Text>
      {trend && (
        <Text
          variant="caption"
          color={trend.direction === 'up' ? colors.success : colors.error}
          style={styles.trend}
        >
          {trend.direction === 'up' ? '↑' : '↓'} {trend.value}%
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 160,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadows.md,
  } as ViewStyle,
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    marginTop: spacing.xs,
  },
  value: {
    fontSize: typography.sizes.xxxl,
    fontFamily: typography.fonts.display,
  },
  trend: {
    fontSize: typography.sizes.xs,
    fontWeight: '700',
  },
});
