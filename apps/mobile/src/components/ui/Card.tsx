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
  const outerVariantStyle = outerVariantStyles[variant];
  const innerVariantStyle = innerVariantStyles[variant];
  const paddingValue = padding ? spacing[padding] : padded ? spacing.lg : 0;
  const accentStyle: ViewStyle | undefined = accentColor
    ? { borderLeftWidth: 3, borderLeftColor: accentColor }
    : undefined;

  const content = (
    // Outer View: carries shadow + backgroundColor (no overflow — would kill iOS shadow)
    <View style={[styles.outer, outerVariantStyle, style as ViewStyle]}>
      {/* Inner View: carries clipping (overflow) + border + radius */}
      <View
        style={[
          styles.inner,
          innerVariantStyle,
          { padding: paddingValue },
          accentStyle,
        ]}
      >
        {children}
      </View>
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
  outer: {
    borderRadius: radius.lg,
    // no overflow here — shadow would be clipped on iOS
  },
  inner: {
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
});

// Outer (shadow + backgroundColor — required for iOS shadow to render)
const outerVariantStyles = StyleSheet.create({
  default: {
    backgroundColor: colors.paper2,
    ...shadows.card,
  } as ViewStyle,
  elevated: {
    backgroundColor: colors.paper2,
    ...shadows.float,
  } as ViewStyle,
  outlined: {
    backgroundColor: colors.paperWarm,
    ...shadows.none,
  } as ViewStyle,
  ghost: {
    backgroundColor: 'transparent',
    ...shadows.none,
  } as ViewStyle,
});

// Inner (border — kept on the clipped view so it renders crisply)
const innerVariantStyles = StyleSheet.create({
  default: {
    borderWidth: 1,
    borderColor: 'rgba(26,20,16,0.07)',
  } as ViewStyle,
  elevated: {} as ViewStyle,
  outlined: {
    borderWidth: 1,
    borderColor: colors.ink4,
  } as ViewStyle,
  ghost: {
    borderWidth: 1,
    borderColor: colors.ink4,
  } as ViewStyle,
});
