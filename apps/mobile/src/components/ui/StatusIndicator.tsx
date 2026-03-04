import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from './Text';
import { COLORS, SPACING, RADIUS } from '@/constants/theme';

const STATUS_CONFIG: Record<string, { color: string; bg: string; labelKey: string }> = {
  draft: { color: COLORS.textMuted, bg: COLORS.muted, labelKey: 'statusIndicator.draft' },
  submitted: { color: COLORS.accent, bg: COLORS.accent + '15', labelKey: 'statusIndicator.submitted' },
  under_review: { color: '#2196F3', bg: '#2196F315', labelKey: 'statusIndicator.underReview' },
  approved: { color: COLORS.success, bg: COLORS.successLight, labelKey: 'statusIndicator.approved' },
  rejected: { color: COLORS.danger, bg: COLORS.dangerLight, labelKey: 'statusIndicator.rejected' },
  matched: { color: COLORS.success, bg: COLORS.successLight, labelKey: 'statusIndicator.matched' },
  partial: { color: COLORS.warning, bg: COLORS.warningLight, labelKey: 'statusIndicator.partial' },
  no_match: { color: COLORS.danger, bg: COLORS.dangerLight, labelKey: 'statusIndicator.noMatch' },
};

interface StatusIndicatorProps {
  status: string;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status }) => {
  const { t } = useTranslation();
  const config = STATUS_CONFIG[status] ?? { color: COLORS.textMuted, bg: COLORS.muted, labelKey: status };
  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <View style={[styles.dot, { backgroundColor: config.color }]} />
      <Text variant="caption" color={config.color} style={styles.label}>
        {t(config.labelKey)}
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
