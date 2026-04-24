import React from 'react';
import {
  TouchableOpacity,
  Text as RNText,
  StyleSheet,
  ActivityIndicator,
  View,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/design/tokens/colors';
import { shadows } from '@/design/tokens/shadows';
import { radius } from '@/design/tokens/radius';
import { typography } from '@/design/tokens/typography';
import { haptic } from '@/lib/haptics';

interface ButtonProps {
  label?: string;
  title?: string;
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
  const isPrimary    = variant === 'primary';
  const isDestructive = variant === 'destructive';
  const isSecondary  = variant === 'secondary';
  const isGhost      = variant === 'ghost';
  const isIcon       = variant === 'icon';

  const handlePress = (): void => {
    if (disabled || loading) return;
    if (isPrimary || isDestructive || isIcon) {
      haptic.medium();
    } else {
      haptic.light();
    }
    onPress();
  };

  const accessibilityLabel = text || undefined;

  const textColor = isPrimary || isDestructive || isIcon
    ? '#ffffff'
    : isGhost
      ? colors.red
      : colors.ink;

  const inner = (
    <View style={styles.inner}>
      {icon && iconPosition === 'left' && icon}
      {text ? (
        <RNText style={[styles.text, textSizeStyles[size], { color: textColor }]}>
          {text}
        </RNText>
      ) : null}
      {icon && iconPosition === 'right' && icon}
    </View>
  );

  if (isPrimary || isDestructive || isIcon) {
    const gradColors: [string, string] = isIcon
      ? [colors.redVivid, colors.red]
      : isDestructive
        ? [colors.redVivid, colors.red]
        : [colors.redVivid, colors.red];

    // Shadow-wrapper pattern: outer View holds the shadow (no overflow, has
    // backgroundColor), inner TouchableOpacity holds the clipping + gradient.
    return (
      <View
        style={[
          isIcon ? styles.iconShadowWrap : styles.shadowWrap,
          shadows.red as ViewStyle,
          fullWidth && styles.fullWidth,
          disabled && styles.disabled,
          style,
        ]}
      >
        <TouchableOpacity
          style={[
            isIcon ? styles.iconBtn : styles.base,
            isIcon ? undefined : sizeStyles[size],
            fullWidth && styles.fullWidth,
          ]}
          onPress={handlePress}
          disabled={disabled || loading}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          accessibilityState={{ disabled: disabled || loading, busy: loading }}
        >
          <LinearGradient
            colors={gradColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: radius.pill }]}
          />
          {loading ? <ActivityIndicator color="#fff" /> : inner}
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.base,
        sizeStyles[size],
        isSecondary && styles.secondary,
        isGhost && styles.ghost,
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
        style,
      ]}
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
    >
      {loading ? <ActivityIndicator color={textColor} /> : inner}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // Outer shadow wrapper for primary/destructive gradient buttons.
  // Must NOT have overflow:'hidden' (kills iOS shadow) and must have
  // backgroundColor so iOS computes the shadow path correctly.
  shadowWrap: {
    borderRadius: radius.pill,
    backgroundColor: colors.red,
  },
  iconShadowWrap: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: colors.red,
  },
  base: {
    borderRadius: radius.pill,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondary: {
    backgroundColor: colors.paper2,
    borderWidth: 1,
    borderColor: colors.ink4,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  iconBtn: {
    width: 52,
    height: 52,
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
    fontFamily: typography.fonts.sansSemibold,
    letterSpacing: typography.letterSpacing.navLabel,
  },
});

const sizeStyles = StyleSheet.create({
  sm: { paddingVertical: 10, paddingHorizontal: 20, minHeight: 38 },
  md: { paddingVertical: 14, paddingHorizontal: 24, minHeight: 52 },
  lg: { paddingVertical: 16, paddingHorizontal: 28, minHeight: 56 },
});

const textSizeStyles = StyleSheet.create({
  sm: { fontSize: typography.sizes.sm },
  md: { fontSize: typography.sizes.md },
  lg: { fontSize: typography.sizes.lg },
});
