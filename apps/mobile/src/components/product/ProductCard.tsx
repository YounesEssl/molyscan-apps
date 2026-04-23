import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AltArrowRight } from 'react-native-solar-icons/icons/bold';
import { MapPoint } from 'react-native-solar-icons/icons/bold-duotone';
import { Text, Card, Badge } from '@/components/ui';
import { ConfidenceIndicator } from './ConfidenceIndicator';
import { colors } from '@/design/tokens/colors';
import { spacing } from '@/design/tokens/spacing';
import { formatRelativeDate } from '@/utils/date';
import type { ScanRecord } from '@/schemas/scan.schema';

interface ProductCardProps {
  scan: ScanRecord;
  onPress: () => void;
  style?: ViewStyle;
}

const STATUS_CONFIG = {
  matched: { labelKey: 'product.statusMatch', variant: 'matched' as const },
  partial: { labelKey: 'product.statusPartial', variant: 'partial' as const },
  no_match: { labelKey: 'product.statusNoMatch', variant: 'unmatched' as const },
} as const;

export const ProductCard: React.FC<ProductCardProps> = ({
  scan,
  onPress,
  style,
}) => {
  const { t } = useTranslation();
  const status = STATUS_CONFIG[scan.status];
  const accentColor = scan.status === 'matched' ? colors.matched : scan.status === 'partial' ? colors.partial : undefined;

  if (!scan.scannedProduct) return null;

  return (
    <Card onPress={onPress} accentColor={accentColor} style={StyleSheet.flatten([styles.card, style])}>
      <View style={styles.row}>
        <View style={styles.info}>
          <View style={styles.header}>
            <Text variant="subheading" numberOfLines={1} style={styles.name}>
              {scan.scannedProduct!.name}
            </Text>
            <Badge label={t(status.labelKey)} variant={status.variant} />
          </View>
          <Text variant="caption">{scan.scannedProduct!.brand} — {scan.scannedProduct!.category}</Text>
          {scan.molydalMatch && (
            <View style={styles.matchRow}>
              <AltArrowRight size={14} color={colors.red} />
              <Text variant="body" color={colors.red} style={styles.matchName}>
                {scan.molydalMatch.name}
              </Text>
              <ConfidenceIndicator score={scan.molydalMatch.confidence} compact />
            </View>
          )}
        </View>
        <AltArrowRight size={20} color={colors.textMuted} />
      </View>
      <View style={styles.footer}>
        <Text variant="caption">{formatRelativeDate(scan.scannedAt)}</Text>
        {scan.location && (
          <View style={styles.locationRow}>
            <MapPoint size={12} color={colors.textMuted} />
            <Text variant="caption" style={styles.locationText}>{typeof scan.location === 'string' ? scan.location : scan.location?.label ?? ''}</Text>
          </View>
        )}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
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
    gap: spacing.sm,
  },
  name: {
    flex: 1,
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
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
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
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
