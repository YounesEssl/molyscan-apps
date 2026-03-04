import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Header } from '@/components/layout/Header';
import { Text, Button } from '@/components/ui';
import { ProductMatch } from '@/components/product/ProductMatch';
import { TechnicalSheet } from '@/components/product/TechnicalSheet';
import { COLORS, SPACING, RADIUS } from '@/constants/theme';
import { scanService } from '@/services/scan.service';
import { formatFullDate } from '@/utils/date';
import type { ScanRecord } from '@/schemas/scan.schema';

const SCAN_METHOD_KEYS: Record<string, string> = {
  barcode: 'product.scanMethodBarcode',
  label: 'product.scanMethodLabel',
  voice: 'product.scanMethodVoice',
  camera: 'product.scanMethodCamera',
};

export default function ProductDetailScreen(): React.JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const [showTechSheet, setShowTechSheet] = useState(false);
  const [scan, setScan] = useState<ScanRecord | null>(null);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    if (id) {
      scanService.getById(id).then((s) => setScan(s ?? null)).catch(() => {}).finally(() => setLoading(false));
    }
  }, [id]);

  if (!scan) {
    return (
      <ScreenWrapper>
        <Header title={t('product.detail')} showBack />
        <View style={styles.notFound}>
          <Text variant="body" color={COLORS.textSecondary}>
            {t('product.scanNotFound')}
          </Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper scroll padded={false}>
      <Header title={t('product.productDetail')} showBack />

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
            {t('product.scannedVia', { method: t(SCAN_METHOD_KEYS[scan.scanMethod] ?? scan.scanMethod) })}
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
                {t('product.noMolydalEquivalent')}
              </Text>
            </View>
          </View>
        )}

        {/* Actions */}
        {scan.molydalMatch && (
          <View style={styles.actions}>
            <Button
              title={t('product.requestPrice')}
              variant="accent"
              icon="pricetag-outline"
              onPress={() => router.push(`/workflow/price-request?scanId=${scan.id}`)}
              style={styles.actionButton}
            />
            <Button
              title={t('product.askAI')}
              variant="primary"
              icon="sparkles-outline"
              onPress={() => router.push(`/chat/conv-${scan.id}`)}
              style={styles.actionButton}
            />
            <Button
              title={t('product.technicalSheet')}
              variant="outline"
              icon="document-text-outline"
              onPress={() => setShowTechSheet(true)}
              style={styles.actionButton}
            />
            <Button
              title={t('product.share')}
              variant="ghost"
              icon="share-outline"
              onPress={() => {}}
              style={styles.actionButton}
            />
          </View>
        )}
      </View>

      <View style={styles.bottomSpacer} />

      {/* Technical sheet modal */}
      {scan.molydalMatch && (
        <Modal visible={showTechSheet} animationType="slide" presentationStyle="pageSheet">
          <ScreenWrapper padded={false}>
            <Header title={t('product.technicalSheet')} showBack onBack={() => setShowTechSheet(false)} />
            <View style={styles.techSheetContent}>
              <TechnicalSheet match={scan.molydalMatch} />
            </View>
          </ScreenWrapper>
        </Modal>
      )}
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
  techSheetContent: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
});
