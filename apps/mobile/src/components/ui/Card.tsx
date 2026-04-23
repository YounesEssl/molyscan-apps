import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { colors } from '@/design/tokens/colors';
import { shadows } from '@/design/tokens/shadows';
import { radius } from '@/design/tokens/radius';
import { spacing } from '@/design/tokens/spacing';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined' | 'ghost';
  padding?: keyof typeof spacing;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  accentColor?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding,
  onPress,
  style,
  padded = true,
  accentColor,
}) => {
  const variantStyle = variantStyles[variant];
  const paddingValue = padding ? spacing[padding] : padded ? spacing.lg : 0;
  const accentStyle: ViewStyle | undefined = accentColor
    ? { borderLeftWidth: 3, borderLeftColor: accentColor }
    : undefined;

  const content = (
    <View
      style={[
        styles.base,
        variantStyle,
        { padding: paddingValue },
        accentStyle,
        style as ViewStyle,
      ]}
    >
      {children}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
});

const variantStyles = StyleSheet.create({
  default: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.md,
  } as ViewStyle,
  elevated: {
    backgroundColor: colors.surface,
    ...shadows.lg,
  } as ViewStyle,
  outlined: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    ...shadows.none,
  } as ViewStyle,
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.none,
  } as ViewStyle,
});
