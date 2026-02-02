import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Card } from '@/components/ui';
import { COLORS, SPACING, RADIUS } from '@/constants/theme';
import { scanService } from '@/services/scan.service';
import type { ScanRecord } from '@/schemas/scan.schema';

function getWeekLabel(weeksAgo: number): string {
  if (weeksAgo === 0) return 'Cette sem.';
  if (weeksAgo === 1) return 'Sem. -1';
  return `Sem. -${weeksAgo}`;
}

export const ScanFrequencyChart: React.FC = () => {
  const [scans, setScans] = useState<ScanRecord[]>([]);

  useEffect(() => {
    scanService.getHistory().then(setScans).catch(() => {});
  }, []);

  const weekData = useMemo(() => {
    const now = new Date();
    const weeks = [0, 0, 0, 0]; // last 4 weeks

    for (const scan of scans) {
      const scanDate = new Date(scan.scannedAt);
      const diffMs = now.getTime() - scanDate.getTime();
      const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
      if (diffWeeks >= 0 && diffWeeks < 4) {
        weeks[diffWeeks]++;
      }
    }

    return weeks.reverse(); // oldest first
  }, [scans]);

  const maxCount = Math.max(...weekData, 1);

  return (
    <Card style={styles.card}>
      <Text variant="label" style={styles.title}>Fréquence des scans</Text>
      <View style={styles.chart}>
        {weekData.map((count, i) => (
          <View key={i} style={styles.column}>
            <View style={styles.barContainer}>
              <View
                style={[
                  styles.bar,
                  { height: `${(count / maxCount) * 100}%` },
                ]}
              />
            </View>
            <Text variant="caption" style={styles.weekLabel}>
              {getWeekLabel(3 - i)}
            </Text>
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
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 120,
    gap: SPACING.sm,
  },
  column: {
    flex: 1,
    alignItems: 'center',
    gap: SPACING.xs,
  },
  barContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: '60%',
    minHeight: 4,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
  },
  weekLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  countLabel: {
    fontWeight: '700',
    color: COLORS.primary,
  },
});
