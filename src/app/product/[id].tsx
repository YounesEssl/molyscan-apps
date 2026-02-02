import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Header } from '@/components/layout/Header';
import { Text, Button } from '@/components/ui';
import { ProductMatch } from '@/components/product/ProductMatch';
import { COLORS, SPACING, RADIUS } from '@/constants/theme';
import { MOCK_SCANS } from '@/mocks/scans.mock';
import { formatFullDate } from '@/utils/date';

export default function ProductDetailScreen(): React.JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const scan = MOCK_SCANS.find((s) => s.id === id);

  if (!scan) {
    return (
      <ScreenWrapper>
        <Header title="Détail" showBack />
        <View style={styles.notFound}>
          <Text variant="body" color={COLORS.textSecondary}>
            Scan introuvable
          </Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper scroll padded={false}>
      <Header title="Détail produit" showBack />

      <View style={styles.content}>
        {/* Date + location */}
        <View style={styles.meta}>
          <Text variant="caption">{formatFullDate(scan.scannedAt)}</Text>
          {scan.location && (
            <Text variant="caption" color={COLORS.textMuted}>
              {typeof scan.location === 'string' ? scan.location : scan.location.label ?? `${scan.location.lat}, ${scan.location.lng}`}
            </Text>
          )}
          <Text variant="caption" color={COLORS.textMuted}>
            Scanné via {scan.scanMethod === 'voice' ? 'vocal' : 'caméra'}
          </Text>
        </View>

        {/* Product match or no match */}
        {scan.molydalMatch ? (
          <ProductMatch
            scannedProduct={scan.scannedProduct}
            molydalMatch={scan.molydalMatch}
          />
        ) : (
          <View style={styles.noMatch}>
            <Text variant="heading">{scan.scannedProduct.name}</Text>
            <Text variant="caption">
              {scan.scannedProduct.brand} — {scan.scannedProduct.category}
            </Text>
            <View style={styles.noMatchBanner}>
              <Text variant="body" color={COLORS.danger}>
                Aucun équivalent Molydal identifié pour ce produit.
              </Text>
            </View>
          </View>
        )}

        {/* Actions */}
        {scan.molydalMatch && (
          <View style={styles.actions}>
            <Button
              title="Demander un prix"
              variant="accent"
              icon="pricetag-outline"
              onPress={() => router.push(`/workflow/price-request?scanId=${scan.id}`)}
              style={styles.actionButton}
            />
            <Button
              title="Poser une question à l'IA"
              variant="primary"
              icon="sparkles-outline"
              onPress={() => router.push(`/chat/conv-${scan.id}`)}
              style={styles.actionButton}
            />
            <Button
              title="Fiche technique"
              variant="outline"
              icon="document-text-outline"
              onPress={() => {}}
              style={styles.actionButton}
            />
            <Button
              title="Partager"
              variant="ghost"
              icon="share-outline"
              onPress={() => {}}
              style={styles.actionButton}
            />
          </View>
        )}
      </View>

      <View style={styles.bottomSpacer} />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
  },
  meta: {
    gap: 2,
  },
  notFound: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noMatch: {
    gap: SPACING.sm,
  },
  noMatchBanner: {
    backgroundColor: COLORS.dangerLight,
    padding: SPACING.md,
    borderRadius: RADIUS.xl,
    marginTop: SPACING.sm,
  },
  actions: {
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  actionButton: {
    width: '100%',
  },
  bottomSpacer: {
    height: SPACING.xxl,
  },
});
