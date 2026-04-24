import React, { useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { Eye } from 'react-native-solar-icons/icons/bold-duotone';
import { EyeClosed } from 'react-native-solar-icons/icons/bold-duotone';
import { Text } from './Text';
import { colors } from '@/design/tokens/colors';
import { shadows } from '@/design/tokens/shadows';
import { radius } from '@/design/tokens/radius';
import { spacing } from '@/design/tokens/spacing';
import { typography } from '@/design/tokens/typography';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  isPassword?: boolean;
  containerStyle?: ViewStyle;
}

export const Input = React.forwardRef<TextInput, InputProps>(({
  label,
  error,
  icon,
  isPassword,
  containerStyle,
  accessibilityLabel,
  accessibilityHint,
  ...props
}, ref) => {
  const [secureEntry, setSecureEntry] = useState(isPassword ?? false);
  const [focused, setFocused] = useState(false);

  const resolvedAccessibilityLabel = accessibilityLabel ?? label;
  const resolvedAccessibilityHint = accessibilityHint ?? (error ? error : undefined);

  return (
    <View style={containerStyle}>
      {label && <Text variant="caption" style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.inputContainer,
          shadows.card as ViewStyle,
          focused && styles.focused,
          error ? styles.errorBorder : undefined,
        ]}
      >
        {icon && (
          <View style={styles.iconBox}>
            {icon}
          </View>
        )}
        <TextInput
          ref={ref}
          style={styles.input}
          placeholderTextColor={colors.ink3}
          secureTextEntry={secureEntry}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          accessibilityLabel={resolvedAccessibilityLabel}
          accessibilityHint={resolvedAccessibilityHint}
          {...props}
        />
        {isPassword && (
          <TouchableOpacity
            onPress={() => setSecureEntry((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={
              secureEntry ? 'Afficher le mot de passe' : 'Masquer le mot de passe'
            }
          >
            {secureEntry ? (
              <EyeClosed size={20} color={colors.ink3} />
            ) : (
              <Eye size={20} color={colors.ink3} />
            )}
          </TouchableOpacity>
        )}
      </View>
      {error && (
        <Text variant="caption" color={colors.red} style={styles.errorText}>
          {error}
        </Text>
      )}
    </View>
  );
});

Input.displayName = 'Input';

const styles = StyleSheet.create({
  label: {
    marginBottom: spacing.sm,
    fontFamily: typography.fonts.sansSemibold,
    color: colors.ink2,
    letterSpacing: 0.3,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(26,20,16,0.1)',
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    minHeight: 52,
    backgroundColor: colors.paper2,
  },
  focused: {
    borderColor: 'rgba(212,37,28,0.4)',
    borderWidth: 1.5,
  },
  errorBorder: {
    borderColor: colors.red,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.paper1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.sans,
    color: colors.ink,
    paddingVertical: 0,
  },
  errorText: {
    marginTop: spacing.xs,
  },
});
