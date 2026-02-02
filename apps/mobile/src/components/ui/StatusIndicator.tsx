import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from './Text';
import { COLORS, SPACING, RADIUS } from '@/constants/theme';

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  draft: { color: COLORS.textMuted, bg: COLORS.muted, label: 'Brouillon' },
  submitted: { color: COLORS.accent, bg: COLORS.accent + '15', label: 'Soumis' },
  under_review: { color: '#2196F3', bg: '#2196F315', label: 'En examen' },
  approved: { color: COLORS.success, bg: COLORS.successLight, label: 'Approuvé' },
  rejected: { color: COLORS.danger, bg: COLORS.dangerLight, label: 'Refusé' },
  matched: { color: COLORS.success, bg: COLORS.successLight, label: 'Trouvé' },
  partial: { color: COLORS.warning, bg: COLORS.warningLight, label: 'Partiel' },
  no_match: { color: COLORS.danger, bg: COLORS.dangerLight, label: 'Aucun' },
};

interface StatusIndicatorProps {
  status: string;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status }) => {
  const config = STATUS_CONFIG[status] ?? { color: COLORS.textMuted, bg: COLORS.muted, label: status };
  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <View style={[styles.dot, { backgroundColor: config.color }]} />
      <Text variant="caption" color={config.color} style={styles.label}>
        {config.label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontWeight: '600',
    fontSize: 12,
  },
});
