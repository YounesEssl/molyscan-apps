import React from 'react';
import {
  TouchableOpacity,
  Text as RNText,
  StyleSheet,
  ActivityIndicator,
  View,
  type ViewStyle,
} from 'react-native';
import { colors } from '@/design/tokens/colors';
import { shadows } from '@/design/tokens/shadows';
import { radius } from '@/design/tokens/radius';
import { typography } from '@/design/tokens/typography';

interface ButtonProps {
  label?: string;
  title?: string; // backwards compat alias for label
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
}

export const Button: React.FC<ButtonProps> = ({
  label,
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
}) => {
  const text = label ?? title ?? '';
  const isPrimary = variant === 'primary';
  const isDestructive = variant === 'destructive';
  const isGhost = variant === 'ghost';
  const isIcon = variant === 'icon';
  const isSecondary = variant === 'secondary';

  const textColor = isPrimary || isDestructive || isIcon
    ? colors.textOnRed
    : isGhost
      ? colors.red
      : colors.textPrimary;

  const bgStyle = isPrimary
    ? { backgroundColor: colors.red, ...shadows.red }
    : isDestructive
      ? { backgroundColor: colors.error, ...shadows.red }
      : isSecondary
        ? { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border, ...shadows.sm }
        : isIcon
          ? { backgroundColor: colors.red, ...shadows.red, width: 64, height: 64, borderRadius: 32, paddingHorizontal: 0, paddingVertical: 0 }
          : { backgroundColor: 'transparent' };

  return (
    <TouchableOpacity
      style={[
        styles.base,
        sizeStyles[isIcon ? 'icon' : size],
        bgStyle as ViewStyle,
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <View style={styles.inner}>
          {icon && iconPosition === 'left' && icon}
          {text ? (
            <RNText
              style={[
                styles.text,
                textSizeStyles[size],
                { color: textColor },
                isPrimary && styles.primaryText,
                isSecondary && styles.secondaryText,
              ]}
            >
              {text}
            </RNText>
          ) : null}
          {icon && iconPosition === 'right' && icon}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.pill,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  disabled: {
    opacity: 0.5,
  },
  fullWidth: {
    width: '100%',
  },
  text: {
    fontFamily: typography.fonts.bodySemibold,
  },
  primaryText: {
    fontFamily: typography.fonts.display,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.wider,
  },
  secondaryText: {
    fontFamily: typography.fonts.bodySemibold,
  },
});

const sizeStyles = StyleSheet.create({
  sm: { paddingVertical: 10, paddingHorizontal: 20, minHeight: 38 },
  md: { paddingVertical: 14, paddingHorizontal: 24, minHeight: 48 },
  lg: { paddingVertical: 16, paddingHorizontal: 28, minHeight: 56 },
  icon: { width: 64, height: 64 },
});

const textSizeStyles = StyleSheet.create({
  sm: { fontSize: typography.sizes.sm },
  md: { fontSize: typography.sizes.md },
  lg: { fontSize: typography.sizes.lg },
});
