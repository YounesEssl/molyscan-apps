import React from 'react';
import {
  Text as RNText,
  StyleSheet,
  type TextProps as RNTextProps,
} from 'react-native';
import { colors } from '@/design/tokens/colors';
import { typography } from '@/design/tokens/typography';

interface TextProps extends RNTextProps {
  variant?: 'display' | 'title' | 'heading' | 'subheading' | 'body' | 'caption' | 'label' | 'mono';
  color?: string;
  italic?: boolean;
}

export const Text: React.FC<TextProps> = ({
  variant = 'body',
  color,
  italic = false,
  style,
  ...props
}) => {
  const fontFamily = italic && variant === 'display'
    ? typography.fonts.displayItalic
    : styles[variant]?.fontFamily;

  return (
    <RNText
      style={[styles[variant], color ? { color } : undefined, fontFamily ? { fontFamily } : undefined, style]}
      {...props}
    />
  );
};

const styles = StyleSheet.create({
  display: {
    fontSize: typography.sizes.hero,
    fontFamily: typography.fonts.display,
    color: colors.ink,
    letterSpacing: typography.letterSpacing.hero,
    lineHeight: typography.sizes.hero * typography.lineHeights.tight,
  },
  title: {
    fontSize: typography.sizes.xxxl,
    fontFamily: typography.fonts.display,
    color: colors.ink,
    letterSpacing: typography.letterSpacing.title,
    lineHeight: typography.sizes.xxxl * 1.15,
  },
  heading: {
    fontSize: typography.sizes.xxl,
    fontFamily: typography.fonts.display,
    color: colors.ink,
    letterSpacing: typography.letterSpacing.title,
  },
  subheading: {
    fontSize: typography.sizes.xl,
    fontFamily: typography.fonts.sansSemibold,
    color: colors.ink,
    letterSpacing: typography.letterSpacing.navLabel,
  },
  body: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.sans,
    color: colors.ink,
    lineHeight: typography.sizes.md * typography.lineHeights.normal,
  },
  caption: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.sans,
    color: colors.ink2,
    lineHeight: typography.sizes.sm * typography.lineHeights.normal,
  },
  label: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.sansSemibold,
    color: colors.ink2,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  mono: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.mono,
    color: colors.ink,
    letterSpacing: 0,
  },
});
