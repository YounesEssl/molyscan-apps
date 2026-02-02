import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Card } from '@/components/ui';
import { COLORS, SPACING, RADIUS } from '@/constants/theme';
import { scanService } from '@/services/scan.service';
import type { ScanRecord } from '@/schemas/scan.schema';

export const CompetitorChart: React.FC = () => {
  const [scans, setScans] = useState<ScanRecord[]>([]);

  useEffect(() => {
    scanService.getHistory().then(setScans).catch(() => {});
  }, []);

  const competitors = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const scan of scans) {
      const brand = scan.scannedProduct?.brand;
      if (brand && brand !== 'Molydal' && brand !== 'Molyduval') {
        counts[brand] = (counts[brand] ?? 0) + 1;
      }
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [scans]);

  const maxCount = competitors[0]?.[1] ?? 1;

  return (
    <Card style={styles.card}>
      <Text variant="label" style={styles.title}>Top concurrents identifiés</Text>
      <View style={styles.chart}>
        {competitors.map(([brand, count]) => (
          <View key={brand} style={styles.row}>
            <Text variant="caption" style={styles.brandLabel} numberOfLines={1}>
              {brand}
            </Text>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  { width: `${(count / maxCount) * 100}%` },
                ]}
              />
            </View>
            <Text variant="caption" style={styles.countLabel}>
              {count}
            </Text>
          </View>
        ))}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: SPACING.sm,
  },
  title: {
    marginBottom: SPACING.xs,
  },
  chart: {
    gap: SPACING.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  brandLabel: {
    width: 90,
    fontWeight: '600',
    color: COLORS.text,
  },
  barTrack: {
    flex: 1,
    height: 20,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
  },
  barFill: {
    height: 20,
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.sm,
  },
  countLabel: {
    width: 24,
    textAlign: 'right',
    fontWeight: '700',
    color: COLORS.primary,
  },
});
