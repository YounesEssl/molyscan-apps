import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, Card, Badge } from '@/components/ui';
import { ConfidenceIndicator } from './ConfidenceIndicator';
import { COLORS, SPACING } from '@/constants/theme';
import { formatRelativeDate } from '@/utils/date';
import type { ScanRecord } from '@/schemas/scan.schema';

interface ProductCardProps {
  scan: ScanRecord;
  onPress: () => void;
  style?: ViewStyle;
}

const STATUS_CONFIG = {
  matched: { label: 'Match', variant: 'success' as const },
  partial: { label: 'Partiel', variant: 'warning' as const },
  no_match: { label: 'Aucun match', variant: 'danger' as const },
} as const;

export const ProductCard: React.FC<ProductCardProps> = ({
  scan,
  onPress,
  style,
}) => {
  const status = STATUS_CONFIG[scan.status];

  return (
    <Card onPress={onPress} style={StyleSheet.flatten([styles.card, style])}>
      <View style={styles.row}>
        <View style={styles.info}>
          <View style={styles.header}>
            <Text variant="subheading" numberOfLines={1} style={styles.name}>
              {scan.scannedProduct.name}
            </Text>
            <Badge label={status.label} variant={status.variant} />
          </View>
          <Text variant="caption">{scan.scannedProduct.brand} — {scan.scannedProduct.category}</Text>
          {scan.molydalMatch && (
            <View style={styles.matchRow}>
              <Ionicons name="arrow-forward" size={14} color={COLORS.primary} />
              <Text variant="body" color={COLORS.primary} style={styles.matchName}>
                {scan.molydalMatch.name}
              </Text>
              <ConfidenceIndicator score={scan.molydalMatch.confidence} compact />
            </View>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
      </View>
      <View style={styles.footer}>
        <Text variant="caption">{formatRelativeDate(scan.scannedAt)}</Text>
        {scan.location && (
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={12} color={COLORS.textMuted} />
            <Text variant="caption" style={styles.locationText}>{typeof scan.location === 'string' ? scan.location : scan.location?.label ?? ''}</Text>
          </View>
        )}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: SPACING.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    gap: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  name: {
    flex: 1,
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: 2,
  },
  matchName: {
    fontSize: 14,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.sm,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  locationText: {
    fontSize: 11,
  },
});
