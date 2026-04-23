import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text, Card, Badge } from '@/components/ui';
import { ScoreIndicator } from '@/components/ui/ScoreIndicator';
import { colors } from '@/design/tokens/colors';
import { shadows } from '@/design/tokens/shadows';
import { spacing } from '@/design/tokens/spacing';
import { radius } from '@/design/tokens/radius';
import type { ScannedProduct, MolydalMatch } from '@/schemas/scan.schema';

interface ProductMatchProps {
  scannedProduct: ScannedProduct;
  molydalMatch: MolydalMatch;
}

export const ProductMatch: React.FC<ProductMatchProps> = ({
  scannedProduct,
  molydalMatch,
}) => {
  const { t } = useTranslation();
  return (
    <Card variant="elevated" padding="xl" style={styles.container}>
      {/* Competitor product */}
      <View style={styles.section}>
        <Badge label={t('product.competitorProduct')} variant="neutral" size="sm" />
        <Text variant="heading" style={styles.productName}>
          {scannedProduct.name}
        </Text>
        <View style={styles.metaRow}>
          <Text variant="caption">{scannedProduct.brand}</Text>
          <Text variant="caption" color={colors.textMuted}>•</Text>
          <Text variant="caption">{scannedProduct.category}</Text>
        </View>
        <Text variant="caption" color={colors.textMuted} style={styles.barcode}>
          {t('product.code', { code: scannedProduct.barcode })}
        </Text>
      </View>

      {/* Score divider */}
      <View style={styles.scoreDivider}>
        <View style={styles.dividerLine} />
        <ScoreIndicator score={molydalMatch.confidence} size="sm" showLabel={false} />
        <View style={styles.dividerLine} />
      </View>

      {/* Molydal match */}
      <View style={[styles.section, styles.molydalSection]}>
        <Badge label={t('scanner.molydalEquivalent')} variant="primary" size="sm" />
        <Text variant="heading" color={colors.red} style={styles.productName}>
          {molydalMatch.name}
        </Text>
        <Text variant="caption">{t('common.ref')} {molydalMatch.reference}</Text>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 0,
  },
  section: {
    gap: spacing.xs,
  },
  molydalSection: {
    paddingTop: spacing.sm,
  },
  productName: {
    marginTop: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  barcode: {
    fontFamily: 'monospace',
    marginTop: spacing.xs,
  },
  scoreDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginVertical: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
});
