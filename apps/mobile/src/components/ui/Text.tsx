import React from 'react';
import {
  Text as RNText,
  StyleSheet,
  type TextProps as RNTextProps,
} from 'react-native';
import { colors } from '@/design/tokens/colors';
import { typography } from '@/design/tokens/typography';

interface TextProps extends RNTextProps {
  variant?: 'title' | 'heading' | 'subheading' | 'body' | 'caption' | 'label';
  color?: string;
}

export const Text: React.FC<TextProps> = ({
  variant = 'body',
  color,
  style,
  ...props
}) => {
  return (
    <RNText
      style={[styles[variant], color ? { color } : undefined, style]}
      {...props}
    />
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: typography.sizes.hero,
    fontWeight: '800',
    fontFamily: typography.fonts.display,
    color: colors.textPrimary,
    letterSpacing: typography.letterSpacing.tight,
  },
  heading: {
    fontSize: typography.sizes.xxl,
    fontWeight: '700',
    fontFamily: typography.fonts.display,
    color: colors.textPrimary,
    letterSpacing: typography.letterSpacing.tight,
  },
  subheading: {
    fontSize: typography.sizes.lg,
    fontWeight: '600',
    fontFamily: typography.fonts.displaySemibold,
    color: colors.textPrimary,
  },
  body: {
    fontSize: typography.sizes.md,
    fontWeight: '400',
    fontFamily: typography.fonts.body,
    color: colors.textPrimary,
    lineHeight: typography.sizes.md * typography.lineHeights.normal,
  },
  caption: {
    fontSize: typography.sizes.sm,
    fontWeight: '500',
    fontFamily: typography.fonts.body,
    color: colors.textSecondary,
  },
  label: {
    fontSize: typography.sizes.xs,
    fontWeight: '700',
    fontFamily: typography.fonts.displaySemibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.wider,
  },
});
