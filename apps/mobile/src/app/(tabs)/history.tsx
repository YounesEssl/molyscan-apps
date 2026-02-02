import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, View, TextInput, type ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Text } from '@/components/ui';
import { Toggle } from '@/components/ui/Toggle';
import { ScanHistoryItem } from '@/components/history/ScanHistoryItem';
import { ScanHistoryFilter } from '@/components/history/ScanHistoryFilter';
import { ScanMap } from '@/components/history/ScanMap';
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOW } from '@/constants/theme';
import { scanService } from '@/services/scan.service';
import type { ScanStatus } from '@/types/scan';
import type { ScanRecord } from '@/schemas/scan.schema';

export default function HistoryScreen(): React.JSX.Element {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ScanStatus | 'all'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [scans, setScans] = useState<ScanRecord[]>([]);

  useEffect(() => {
    scanService.getHistory().then(setScans).catch(() => {});
  }, []);

  const filteredScans = useMemo(() => {
    let result: ScanRecord[] = scans;
    if (filter !== 'all') {
      result = result.filter((s) => s.status === filter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.scannedProduct?.name.toLowerCase().includes(q) ||
          s.scannedProduct?.brand.toLowerCase().includes(q) ||
          s.molydalMatch?.name.toLowerCase().includes(q),
      );
    }
    return result;
  }, [filter, search, scans]);

  const renderItem = ({ item }: { item: ScanRecord }) => (
    <ScanHistoryItem
      scan={item}
      onPress={() => router.push(`/product/${item.id}`)}
    />
  );

  const keyExtractor = (item: ScanRecord) => item.id;

  return (
    <ScreenWrapper padded={false}>
      <View style={styles.header}>
        <Text variant="heading">Historique</Text>
      </View>

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, SHADOW.sm as ViewStyle]}>
          <View style={styles.searchIconBox}>
            <Ionicons name="search" size={16} color={COLORS.textMuted} />
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un produit..."
            placeholderTextColor={COLORS.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {/* View mode toggle */}
      <View style={styles.toggleContainer}>
        <Toggle
          options={[
            { label: 'Liste', value: 'list' },
            { label: 'Carte', value: 'map' },
          ]}
          value={viewMode}
          onChange={(v) => setViewMode(v as 'list' | 'map')}
        />
      </View>

      {viewMode === 'list' ? (
        <>
          {/* Filters */}
          <View style={styles.filterContainer}>
            <ScanHistoryFilter activeFilter={filter} onFilterChange={setFilter} />
          </View>

          {/* List */}
          <FlatList
            data={filteredScans}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={
              <View style={styles.empty}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="file-tray-outline" size={40} color={COLORS.textMuted} />
                </View>
                <Text variant="body" color={COLORS.textSecondary}>
                  Aucun scan pour le moment
                </Text>
              </View>
            }
          />
        </>
      ) : (
        <ScanMap scans={filteredScans} />
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
  },
  searchContainer: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  toggleContainer: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    paddingHorizontal: SPACING.md,
    height: 48,
  },
  searchIconBox: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
    paddingVertical: 0,
    fontWeight: '500',
  },
  filterContainer: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  separator: {
    height: SPACING.md,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: SPACING.md,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
