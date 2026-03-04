import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, SPACING, RADIUS } from '@/constants/theme';
import type { ScanStatus } from '@/types/scan';

interface ScanHistoryFilterProps {
  activeFilter: ScanStatus | 'all';
  onFilterChange: (filter: ScanStatus | 'all') => void;
}

const FILTERS: { key: ScanStatus | 'all'; labelKey: string }[] = [
  { key: 'all', labelKey: 'history.filterAll' },
  { key: 'matched', labelKey: 'history.filterMatched' },
  { key: 'pending', labelKey: 'history.filterPending' },
  { key: 'no_match', labelKey: 'history.filterNoMatch' },
];

export const ScanHistoryFilter: React.FC<ScanHistoryFilterProps> = ({
  activeFilter,
  onFilterChange,
}) => {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      {FILTERS.map((filter) => {
        const active = activeFilter === filter.key;
        if (active) {
          return (
            <TouchableOpacity
              key={filter.key}
              onPress={() => onFilterChange(filter.key)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[...GRADIENTS.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.chipActive}
              >
                <Text style={styles.chipTextActive}>{t(filter.labelKey)}</Text>
              </LinearGradient>
            </TouchableOpacity>
          );
        }
        return (
          <TouchableOpacity
            key={filter.key}
            style={styles.chip}
            onPress={() => onFilterChange(filter.key)}
            activeOpacity={0.7}
          >
            <Text style={styles.chipText}>{t(filter.labelKey)}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.full,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  chipTextActive: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.surface,
  },
});
