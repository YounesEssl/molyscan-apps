import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from './Text';
import { COLORS, SPACING, RADIUS } from '@/constants/theme';

interface ToggleOption {
  label: string;
  value: string;
}

interface ToggleProps {
  options: ToggleOption[];
  value: string;
  onChange: (value: string) => void;
}

export const Toggle: React.FC<ToggleProps> = ({ options, value, onChange }) => (
  <View style={styles.container}>
    {options.map((opt) => (
      <TouchableOpacity
        key={opt.value}
        style={[styles.option, value === opt.value && styles.active]}
        onPress={() => onChange(opt.value)}
      >
        <Text
          variant="caption"
          color={value === opt.value ? COLORS.surface : COLORS.textSecondary}
          style={styles.label}
        >
          {opt.label}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: COLORS.muted,
    borderRadius: RADIUS.lg,
    padding: 3,
  },
  option: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderRadius: RADIUS.md,
  },
  active: {
    backgroundColor: COLORS.primary,
  },
  label: {
    fontWeight: '600',
  },
});
