import React from 'react';
import { View, StyleSheet, TouchableOpacity, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui';
import { COLORS, SPACING, RADIUS, SHADOW } from '@/constants/theme';
import { formatRelativeDate } from '@/utils/date';
import type { ScanRecord } from '@/schemas/scan.schema';

interface ScanHistoryItemProps {
  scan: ScanRecord;
  onPress: () => void;
}

const STATUS_ICON = {
  matched: { name: 'checkmark-circle' as const, color: COLORS.success },
  partial: { name: 'time' as const, color: COLORS.warning },
  no_match: { name: 'close-circle' as const, color: COLORS.danger },
} as const;

export const ScanHistoryItem: React.FC<ScanHistoryItemProps> = ({
  scan,
  onPress,
}) => {
  const icon = STATUS_ICON[scan.status];

  return (
    <TouchableOpacity
      style={[styles.container, SHADOW.md as ViewStyle]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconBox, { backgroundColor: icon.color + '15' }]}>
        <Ionicons name={icon.name} size={24} color={icon.color} />
      </View>
      <View style={styles.content}>
        <Text variant="subheading" numberOfLines={1}>
          {scan.scannedProduct.name}
        </Text>
        <Text variant="caption">
          {scan.scannedProduct.brand}
        </Text>
        {scan.molydalMatch ? (
          <Text variant="caption" color={COLORS.primary} style={styles.matchText}>
            → {scan.molydalMatch.name} ({scan.molydalMatch.confidence}%)
          </Text>
        ) : (
          <Text variant="caption" color={COLORS.danger}>
            Aucun équivalent
          </Text>
        )}
      </View>
      <View style={styles.right}>
        <Text variant="caption">{formatRelativeDate(scan.scannedAt)}</Text>
        <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xxl,
    padding: SPACING.md + 4,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 2,
  },
  matchText: {
    fontWeight: '600',
  },
  right: {
    alignItems: 'flex-end',
    gap: SPACING.xs,
  },
});
