import React from 'react';
import { View, StyleSheet, TouchableOpacity, type ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CheckCircle } from 'react-native-solar-icons/icons/bold-duotone';
import { ClockCircle } from 'react-native-solar-icons/icons/bold-duotone';
import { DangerCircle } from 'react-native-solar-icons/icons/bold-duotone';
import { AltArrowRight } from 'react-native-solar-icons/icons/bold';
import { Text } from '@/components/ui';
import { colors } from '@/design/tokens/colors';
import { shadows } from '@/design/tokens/shadows';
import { spacing } from '@/design/tokens/spacing';
import { radius } from '@/design/tokens/radius';
import { formatRelativeDate } from '@/utils/date';
import type { ScanRecord } from '@/schemas/scan.schema';

interface ScanHistoryItemProps {
  scan: ScanRecord;
  onPress: () => void;
}

const STATUS_CONFIG = {
  matched: { Icon: CheckCircle, color: colors.matched, accentColor: colors.matched },
  partial: { Icon: ClockCircle, color: colors.partial, accentColor: colors.partial },
  no_match: { Icon: DangerCircle, color: colors.unmatched, accentColor: colors.unmatched },
} as const;

export const ScanHistoryItem: React.FC<ScanHistoryItemProps> = ({
  scan,
  onPress,
}) => {
  const { t } = useTranslation();
  const config = STATUS_CONFIG[scan.status];
  const Icon = config.Icon;

  return (
    <TouchableOpacity
      style={[styles.container]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={[styles.iconBox, { backgroundColor: config.color + '15' }]}>
        <Icon size={24} color={config.color} />
      </View>
      <View style={styles.content}>
        <Text variant="subheading" numberOfLines={1}>
          {scan.scannedProduct?.name ?? t('history.unknownProduct', 'Produit inconnu')}
        </Text>
        <Text variant="caption">
          {scan.scannedProduct?.brand ?? '—'}
        </Text>
        {scan.molydalMatch ? (
          <Text variant="caption" color={colors.red} style={styles.matchText}>
            → {scan.molydalMatch.name} ({scan.molydalMatch.confidence}%)
          </Text>
        ) : (
          <Text variant="caption" color={colors.error}>
            {t('history.noEquivalent')}
          </Text>
        )}
      </View>
      <View style={styles.right}>
        <Text variant="caption">{formatRelativeDate(scan.scannedAt)}</Text>
        <AltArrowRight size={16} color={colors.textMuted} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...shadows.md,
  } as ViewStyle,
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
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
    gap: spacing.xs,
  },
});
