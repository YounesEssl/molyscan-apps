import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/Text';
import { Aura } from '@/components/ui/Aura';
import { ProductDetailHeader } from '@/components/product/ProductDetailHeader';
import { ProductMainCard } from '@/components/product/ProductMainCard';
import {
  ProductSpecs,
  type ProductSpec,
} from '@/components/product/ProductSpecs';
import { AIProductEntry } from '@/components/product/AIProductEntry';
import { PriceRequestCTA } from '@/components/product/PriceRequestCTA';
import { colors } from '@/design/tokens/colors';
import { scanService } from '@/services/scan.service';
import { chatFreeService } from '@/services/chatFree.service';

interface ScanDetail {
  id: string;
  scannedProduct: { name: string; brand: string; category: string } | null;
  molydalMatch: {
    name: string;
    reference: string;
    category: string;
    confidence: number;
  } | null;
  equivalents: Array<{
    name: string;
    family: string;
    compatibility: number;
    reason: string;
  }>;
  analysisText: string | null;
  identifiedSpecs: string | null;
  status: string;
  scannedAt: string;
  scanMethod: string;
  location: { lat: number; lng: number; label?: string } | null;
}

function buildSpecs(scan: ScanDetail | null): ProductSpec[] {
  if (!scan?.identifiedSpecs) return [];
  // Parse real specs from scan.identifiedSpecs if the format is structured.
  // Otherwise return an empty array and the UI will hide the Specs section.
  return [];
}

export default function ProductDetailScreen(): React.JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [scan, setScan] = useState<ScanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [creatingChat, setCreatingChat] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      setLoading(true);
      scanService
        .getById(id)
        .then((s) => setScan((s as unknown as ScanDetail) ?? null))
        .catch(() => {})
        .finally(() => setLoading(false));
    }, [id]),
  );

  const bestEquiv = scan?.equivalents?.[0];
  const confidence =
    bestEquiv?.compatibility ?? scan?.molydalMatch?.confidence ?? 0;
  const productName = bestEquiv?.name ?? scan?.molydalMatch?.name ?? '';
  const competitorName = scan?.scannedProduct?.name ?? 'Competitor product';
  const hasEquivalent = productName.length > 0;

  const handleAskAI = async (): Promise<void> => {
    if (!scan?.scannedProduct || creatingChat) return;
    setCreatingChat(true);
    try {
      const conv = await chatFreeService.createProductConversation({
        scannedName: scan.scannedProduct.name,
        scannedBrand: scan.scannedProduct.brand,
        molydalName:
          bestEquiv?.name || scan.molydalMatch?.name || 'To be determined',
      });
      router.push(`/chat/${conv.id}`);
    } catch {
      const fallback = await chatFreeService.createConversation(
        scan.scannedProduct.name,
      );
      router.push(`/chat/${fallback.id}`);
    } finally {
      setCreatingChat(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ProductDetailHeader onBack={() => router.back()} />
        <View style={styles.centered}>
          <Text variant="body" color={colors.ink3}>
            Loading...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Aura
        width={400}
        height={300}
        color={colors.redVivid}
        opacity={0.1}
        style={{ top: -80, left: -50 }}
      />

      <ProductDetailHeader onBack={() => router.back()} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {hasEquivalent ? (
          <ProductMainCard
            productName={productName}
            competitorName={competitorName}
            confidence={confidence}
          />
        ) : (
          <View style={styles.emptyState}>
            <Text variant="heading" style={styles.emptyTitle}>
              No equivalent found
            </Text>
            <Text variant="body" color={colors.ink3} style={styles.emptyBody}>
              We haven't identified a Molydal equivalent product for{' '}
              {competitorName} yet.
            </Text>
          </View>
        )}

        <ProductSpecs specs={buildSpecs(scan)} />

        {hasEquivalent ? (
          <AIProductEntry
            productName={productName}
            onPress={handleAskAI}
            disabled={creatingChat}
          />
        ) : null}

        <PriceRequestCTA
          onPress={() => router.push('/workflow/price-request')}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper1,
    overflow: 'hidden',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    paddingBottom: 100,
  },
  emptyState: {
    marginHorizontal: 20,
    marginTop: 10,
    padding: 24,
    borderRadius: 20,
    backgroundColor: colors.paper2,
    borderWidth: 1,
    borderColor: 'rgba(26,20,16,0.07)',
    alignItems: 'center',
  },
  emptyTitle: {
    textAlign: 'center',
  },
  emptyBody: {
    textAlign: 'center',
    marginTop: 8,
  },
});
