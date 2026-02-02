import React from 'react';
import {
  Text as RNText,
  StyleSheet,
  type TextProps as RNTextProps,
} from 'react-native';
import { COLORS, FONT_SIZE } from '@/constants/theme';

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
    fontSize: FONT_SIZE.hero,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  heading: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  subheading: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  body: {
    fontSize: FONT_SIZE.md,
    fontWeight: '400',
    color: COLORS.text,
    lineHeight: 22,
  },
  caption: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  label: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
