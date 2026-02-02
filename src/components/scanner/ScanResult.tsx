import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Text, Button, Card, Badge } from '@/components/ui';
import { ConfidenceIndicator } from '@/components/product/ConfidenceIndicator';
import { COLORS, SPACING } from '@/constants/theme';
import type { ScanRecord } from '@/schemas/scan.schema';

interface ScanResultProps {
  scan: ScanRecord;
  onScanAgain: () => void;
}

export const ScanResult: React.FC<ScanResultProps> = ({
  scan,
  onScanAgain,
}) => {
  const router = useRouter();
  const { scannedProduct, molydalMatch } = scan;

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <View style={styles.header}>
          <Text variant="label">Produit scanné</Text>
          <Badge
            label={scannedProduct.brand}
            variant="neutral"
          />
        </View>
        <Text variant="subheading">{scannedProduct.name}</Text>
        <Text variant="caption">{scannedProduct.category}</Text>

        {molydalMatch && (
          <>
            <View style={styles.divider} />
            <Text variant="label">Équivalent Molydal</Text>
            <Text variant="subheading" color={COLORS.primary}>
              {molydalMatch.name}
            </Text>
            <Text variant="caption">{molydalMatch.reference}</Text>
            <ConfidenceIndicator score={molydalMatch.confidence} />
          </>
        )}

        {!molydalMatch && (
          <>
            <View style={styles.divider} />
            <Text variant="body" color={COLORS.danger}>
              Aucun équivalent trouvé
            </Text>
          </>
        )}
      </Card>

      <View style={styles.actions}>
        {molydalMatch && (
          <Button
            title="Voir le détail"
            variant="accent"
            icon="arrow-forward"
            onPress={() => router.push(`/product/${scan.id}`)}
            style={styles.actionButton}
          />
        )}
        <Button
          title="Scanner un autre"
          variant={molydalMatch ? 'outline' : 'accent'}
          icon="scan-outline"
          onPress={onScanAgain}
          style={styles.actionButton}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: SPACING.md,
  },
  card: {
    gap: SPACING.xs + 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.sm,
  },
  actions: {
    gap: SPACING.sm,
  },
  actionButton: {
    width: '100%',
  },
});
