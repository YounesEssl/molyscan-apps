import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui';
import { ProductCard } from '@/components/product/ProductCard';
import { COLORS, SPACING } from '@/constants/theme';
import { MOCK_SCANS } from '@/mocks/scans.mock';

export const RecentScans: React.FC = () => {
  const router = useRouter();
  const scans = MOCK_SCANS.slice(0, 3);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="subheading">Derniers scans</Text>
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/history')}
          style={styles.seeAll}
          hitSlop={8}
        >
          <Text variant="caption" color={COLORS.accent} style={styles.seeAllText}>
            Voir tout
          </Text>
          <Ionicons name="chevron-forward" size={14} color={COLORS.accent} />
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
    gap: SPACING.md,
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
    gap: SPACING.md,
  },
});
