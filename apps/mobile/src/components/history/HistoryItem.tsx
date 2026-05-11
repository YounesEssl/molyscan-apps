import React, { useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text as RNText,
  type ViewStyle,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { colors } from '@/design/tokens/colors';
import { typography } from '@/design/tokens/typography';
import { haptic } from '@/lib/haptics';
import type { ScanRecord, ScanStatus } from '@/schemas/scan.schema';

interface HistoryItemProps {
  scan: ScanRecord;
  onPress: () => void;
}

const STATUS_STYLE: Record<ScanStatus, { labelKey: string; bg: string; text: string }> = {
  matched: { labelKey: 'history.statusMatched', bg: colors.okBg, text: colors.ok },
  partial: { labelKey: 'history.statusPartial', bg: colors.warnBg, text: colors.warn },
  no_match: {
    labelKey: 'history.statusNoMatch',
    bg: 'rgba(26,20,16,0.05)',
    text: colors.ink2,
  },
};

function formatTime(dateStr: string): string {
  const locale = i18n.language === 'fr' ? 'fr-FR' : 'en-US';
  return new Date(dateStr).toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const HistoryItem = React.memo(function HistoryItem({
  scan,
  onPress,
}: HistoryItemProps): React.JSX.Element {
  const { t } = useTranslation();
  const confidence = scan.molydalMatch?.confidence ?? 0;
  const status = STATUS_STYLE[scan.status];
  const brand = scan.scannedProduct?.brand ?? t('history.defaultBrand');
  const equiv = scan.molydalMatch?.name ?? t('history.noEquivalent');

  const handlePress = useCallback(() => {
    haptic.light();
    onPress();
  }, [onPress]);

  const accessibilityLabel = t('history.a11yScan', {
    brand,
    equiv,
    confidence:
      confidence > 0
        ? t('history.a11yConfidenceSuffix', { percent: confidence })
        : '',
  });

  return (
    <TouchableOpacity
      style={styles.item}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      {/* Top row: status pill + confidence */}
      <View style={styles.topRow}>
        <View style={[styles.pill, { backgroundColor: status.bg }]}>
          <RNText style={[styles.pillText, { color: status.text }]}>
            {t(status.labelKey)}
          </RNText>
        </View>
        {confidence > 0 ? (
          <RNText style={styles.conf}>
            {confidence}
            <RNText style={styles.confSub}>%</RNText>
          </RNText>
        ) : null}
      </View>

      {/* Brand (small caps) */}
      <RNText style={styles.brand} numberOfLines={1}>
        {brand}
      </RNText>

      {/* Molydal equivalent (serif headline) */}
      <RNText style={styles.equiv} numberOfLines={1}>
        {equiv}
      </RNText>

      {/* Bottom meta: time · location */}
      {(scan.scannedAt || scan.location?.label) ? (
        <RNText style={styles.meta} numberOfLines={1}>
          {scan.scannedAt ? formatTime(scan.scannedAt) : ''}
          {scan.scannedAt && scan.location?.label ? ' · ' : ''}
          {scan.location?.label ?? ''}
        </RNText>
      ) : null}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  item: {
    padding: 16,
    borderRadius: 14,
    backgroundColor: colors.paper2,
    borderWidth: 1,
    borderColor: 'rgba(26,20,16,0.07)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  } as ViewStyle,
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  conf: {
    fontFamily: typography.fonts.mono,
    fontSize: 16,
    fontWeight: '600',
    color: colors.ink,
    letterSpacing: -0.3,
  },
  confSub: {
    fontSize: 10,
    fontWeight: '400',
    color: colors.ink3,
  },
  brand: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.ink2,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  equiv: {
    fontFamily: typography.fonts.display,
    fontSize: 19,
    color: colors.ink,
    letterSpacing: -0.4,
    lineHeight: 23,
    marginTop: 2,
  },
  meta: {
    fontFamily: typography.fonts.mono,
    fontSize: 10,
    color: colors.ink3,
    marginTop: 8,
  },
});
