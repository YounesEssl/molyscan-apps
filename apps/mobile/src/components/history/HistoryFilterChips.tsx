import React from 'react';
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Text,
} from 'react-native';
import { colors } from '@/design/tokens/colors';
import { radius } from '@/design/tokens/radius';
import { spacing } from '@/design/tokens/spacing';

export interface HistoryFilterOption<T extends string> {
  id: T;
  label: string;
}

interface HistoryFilterChipsProps<T extends string> {
  options: HistoryFilterOption<T>[];
  value: T;
  onChange: (id: T) => void;
}

export function HistoryFilterChips<T extends string>({
  options,
  value,
  onChange,
}: HistoryFilterChipsProps<T>): React.JSX.Element {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {options.map((f) => {
        const active = value === f.id;
        return (
          <TouchableOpacity
            key={f.id}
            style={[styles.chip, active ? styles.chipActive : null]}
            onPress={() => onChange(f.id)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={f.label}
            accessibilityState={{ selected: active }}
          >
            <Text
              style={active ? styles.textActive : styles.text}
              numberOfLines={1}
              allowFontScaling={false}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const textBase = {
  fontSize: 14,
  fontWeight: '600' as const,
  letterSpacing: -0.1,
  includeFontPadding: false,
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: spacing.section,
    paddingVertical: 14,
  },
  chip: {
    paddingHorizontal: 16,
    minHeight: 36,
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.paper2,
    borderWidth: 1,
    borderColor: 'rgba(26,20,16,0.08)',
  },
  chipActive: {
    paddingHorizontal: 16,
    minHeight: 36,
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  text: {
    ...textBase,
    color: colors.ink,
  },
  textActive: {
    ...textBase,
    color: '#fff',
  },
});
