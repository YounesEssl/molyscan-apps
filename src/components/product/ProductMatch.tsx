import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, Card, Badge } from '@/components/ui';
import { ConfidenceIndicator } from './ConfidenceIndicator';
import { COLORS, GRADIENTS, SPACING, RADIUS, SHADOW } from '@/constants/theme';
import type { ScannedProduct, MolydalMatch } from '@/schemas/scan.schema';

interface ProductMatchProps {
  scannedProduct: ScannedProduct;
  molydalMatch: MolydalMatch;
}

export const ProductMatch: React.FC<ProductMatchProps> = ({
  scannedProduct,
  molydalMatch,
}) => {
  return (
    <View style={styles.container}>
      {/* Competitor product */}
      <Card style={styles.section}>
        <Text variant="label">Produit concurrent</Text>
        <Text variant="heading" style={styles.productName}>
          {scannedProduct.name}
        </Text>
        <View style={styles.metaRow}>
          <Badge label={scannedProduct.brand} variant="neutral" />
          <Text variant="caption">{scannedProduct.category}</Text>
        </View>
        <Text variant="caption" style={styles.barcode}>
          Code : {scannedProduct.barcode}
        </Text>
      </Card>

      {/* Arrow */}
      <View style={styles.arrowContainer}>
        <LinearGradient
          colors={[...GRADIENTS.accent]}
          style={[styles.arrowCircle, SHADOW.accent as ViewStyle]}
        >
          <Ionicons name="swap-vertical" size={24} color={COLORS.surface} />
        </LinearGradient>
      </View>

      {/* Molydal match */}
      <Card style={StyleSheet.flatten([styles.section, styles.molydalSection])}>
        <Text variant="label" color={COLORS.accent}>
          Équivalent Molydal
        </Text>
        <Text variant="heading" color={COLORS.primary} style={styles.productName}>
          {molydalMatch.name}
        </Text>
        <Text variant="caption">Réf. {molydalMatch.reference}</Text>
        <ConfidenceIndicator score={molydalMatch.confidence} />
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 0,
  },
  section: {
    gap: SPACING.xs,
  },
  molydalSection: {
    borderWidth: 2,
    borderColor: COLORS.accent + '25',
  },
  productName: {
    marginTop: SPACING.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  barcode: {
    fontFamily: 'monospace',
    marginTop: SPACING.xs,
  },
  arrowContainer: {
    alignItems: 'center',
    marginVertical: -SPACING.md,
    zIndex: 1,
  },
  arrowCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  advantages: {
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  advantagesTitle: {
    marginBottom: 2,
  },
  advantageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  advantageText: {
    flex: 1,
    fontSize: 14,
  },
});
