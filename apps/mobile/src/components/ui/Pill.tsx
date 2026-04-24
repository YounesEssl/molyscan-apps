import React from 'react';
import { View, Text, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { colors } from '@/design/tokens/colors';
import { radius } from '@/design/tokens/radius';
import { typography } from '@/design/tokens/typography';

export type PillVariant = 'default' | 'accent' | 'ok' | 'warn' | 'purple';
export type PillSize = 'sm' | 'md';

interface PillProps {
  children: React.ReactNode;
  variant?: PillVariant;
  size?: PillSize;
  icon?: React.ReactNode;
  style?: ViewStyle;
}

const VARIANTS: Record<PillVariant, { bg: string; border: string; text: string }> = {
  default: {
    bg: 'rgba(26,20,16,0.05)',
    border: 'rgba(26,20,16,0.08)',
    text: colors.ink2,
  },
  accent: {
    bg: 'rgba(255,59,48,0.08)',
    border: 'rgba(255,59,48,0.2)',
    text: '#c41d12',
  },
  ok: {
    bg: colors.okBg,
    border: 'rgba(48,209,88,0.25)',
    text: colors.ok,
  },
  warn: {
    bg: colors.warnBg,
    border: 'rgba(255,159,10,0.25)',
    text: colors.warn,
  },
  purple: {
    bg: 'rgba(91,45,255,0.1)',
    border: 'rgba(91,45,255,0.25)',
    text: colors.purple,
  },
};

export const Pill: React.FC<PillProps> = ({
  children,
  variant = 'default',
  size = 'sm',
  icon,
  style,
}) => {
  const v = VARIANTS[variant];
  const sizeStyles = size === 'md' ? styles.md : styles.sm;
  const textStyle: TextStyle =
    size === 'md' ? styles.textMd : styles.textSm;

  return (
    <View
      style={[
        styles.base,
        sizeStyles,
        { backgroundColor: v.bg, borderColor: v.border },
        style,
      ]}
    >
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <Text style={[textStyle, { color: v.text }]}>{children}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  sm: {
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  md: {
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  icon: { marginRight: -1 },
  textSm: {
    fontFamily: typography.fonts.sansMedium,
    fontSize: 11,
    letterSpacing: -0.1,
  },
  textMd: {
    fontFamily: typography.fonts.sansSemibold,
    fontSize: 12,
    letterSpacing: -0.1,
  },
});
