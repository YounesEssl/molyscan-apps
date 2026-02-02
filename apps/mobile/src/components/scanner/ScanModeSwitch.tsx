import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui';
import { COLORS, SPACING, RADIUS } from '@/constants/theme';
import type { ScanMethod } from '@/schemas/scan.schema';

interface ScanModeSwitchProps {
  mode: ScanMethod;
  onChange: (mode: ScanMethod) => void;
}

const MODES: { value: ScanMethod; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'barcode', label: 'Code', icon: 'barcode-outline' },
  { value: 'label', label: 'Étiquette', icon: 'camera-outline' },
  { value: 'voice', label: 'Vocal', icon: 'mic-outline' },
];

export const ScanModeSwitch: React.FC<ScanModeSwitchProps> = ({ mode, onChange }) => (
  <View style={styles.container}>
    {MODES.map((m) => {
      const active = mode === m.value;
      return (
        <TouchableOpacity
          key={m.value}
          style={[styles.option, active && styles.active]}
          onPress={() => onChange(m.value)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={m.icon}
            size={16}
            color={active ? COLORS.surface : 'rgba(255,255,255,0.6)'}
          />
          <Text
            variant="caption"
            color={active ? COLORS.surface : 'rgba(255,255,255,0.6)'}
            style={styles.label}
          >
            {m.label}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: RADIUS.lg,
    padding: 3,
  },
  option: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    borderRadius: RADIUS.md,
  },
  active: {
    backgroundColor: COLORS.accent,
  },
  label: {
    fontWeight: '600',
    fontSize: 11,
  },
});
