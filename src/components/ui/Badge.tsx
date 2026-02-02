import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, RADIUS, SPACING, FONT_SIZE } from '@/constants/theme';

interface BadgeProps {
  label: string;
  variant?: 'success' | 'warning' | 'danger' | 'neutral' | 'primary';
  onPress?: () => void;
}

const BADGE_COLORS = {
  success: { bg: COLORS.successLight, text: COLORS.success },
  warning: { bg: COLORS.warningLight, text: COLORS.warning },
  danger: { bg: COLORS.dangerLight, text: COLORS.danger },
  neutral: { bg: '#F1F5F9', text: COLORS.textSecondary },
  primary: { bg: '#EEF2FF', text: COLORS.primary },
} as const;

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'neutral',
  onPress,
}) => {
  const colors = BADGE_COLORS[variant];
  const content = (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.text, { color: colors.text }]}>{label}</Text>
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
    paddingHorizontal: SPACING.sm + 4,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.full,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
