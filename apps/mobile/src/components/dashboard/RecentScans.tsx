import React, { useCallback, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter, useFocusEffect } from 'expo-router';
import { AltArrowRight } from 'react-native-solar-icons/icons/bold';
import { Text } from '@/components/ui';
import { ProductCard } from '@/components/product/ProductCard';
import { colors } from '@/design/tokens/colors';
import { spacing } from '@/design/tokens/spacing';
import { scanService } from '@/services/scan.service';
import type { ScanRecord } from '@/schemas/scan.schema';

export const RecentScans: React.FC = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const [scans, setScans] = useState<ScanRecord[]>([]);

  useFocusEffect(
    useCallback(() => {
      scanService.getHistory().then((all) => setScans(all.filter((s) => s.scannedProduct).slice(0, 3))).catch(() => {});
    }, []),
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="subheading">{t('dashboard.recentScans')}</Text>
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/history')}
          style={styles.seeAll}
          hitSlop={8}
        >
          <Text variant="caption" color={colors.red} style={styles.seeAllText}>
            {t('common.seeAll')}
          </Text>
          <AltArrowRight size={14} color={colors.red} />
        </TouchableOpacity>
      </View>
      <View style={styles.list}>
        {scans.map((scan) => (
          <ProductCard
            key={scan.id}
            scan={scan}
            onPress={() => router.push(`/product/${scan.id}`)}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  seeAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    fontWeight: '700',
  },
  list: {
    gap: spacing.md,
  },
});
