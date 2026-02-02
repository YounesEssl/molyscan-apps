import React, { useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { COLORS, RADIUS, SPACING, FONT_SIZE, SHADOW } from '@/constants/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  isPassword?: boolean;
  containerStyle?: ViewStyle;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  icon,
  isPassword,
  containerStyle,
  ...props
}) => {
  const [secureEntry, setSecureEntry] = useState(isPassword ?? false);
  const [focused, setFocused] = useState(false);

  return (
    <View style={containerStyle}>
      {label && <Text variant="caption" style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.inputContainer,
          SHADOW.sm as ViewStyle,
          focused && styles.focused,
          error ? styles.error : undefined,
        ]}
      >
        {icon && (
          <View style={styles.iconBox}>
            <Ionicons name={icon} size={18} color={focused ? COLORS.primary : COLORS.textMuted} />
          </View>
        )}
        <TextInput
          style={styles.input}
          placeholderTextColor={COLORS.textMuted}
          secureTextEntry={secureEntry}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...props}
        />
        {isPassword && (
          <TouchableOpacity onPress={() => setSecureEntry((v) => !v)}>
            <Ionicons
              name={secureEntry ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={COLORS.textMuted}
            />
          </TouchableOpacity>
        )}
      </View>
      {error && (
        <Text variant="caption" color={COLORS.danger} style={styles.errorText}>
          {error}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  label: {
    marginBottom: SPACING.sm,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.xl,
    paddingHorizontal: SPACING.md,
    minHeight: 52,
    backgroundColor: COLORS.surface,
  },
  focused: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  error: {
    borderColor: COLORS.danger,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  input: {
    flex: 1,
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
    paddingVertical: 0,
    fontWeight: '500',
  },
  errorText: {
    marginTop: SPACING.xs,
  },
});
