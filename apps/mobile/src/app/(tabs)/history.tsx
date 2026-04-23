import React, { lazy, Suspense, useCallback, useMemo, useState } from 'react';
import { FlatList, Platform, StyleSheet, View, TextInput, type ViewStyle } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Magnifer } from 'react-native-solar-icons/icons/bold-duotone';
import { Box } from 'react-native-solar-icons/icons/bold-duotone';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Text } from '@/components/ui';
import { Toggle } from '@/components/ui/Toggle';
import { ScanHistoryItem } from '@/components/history/ScanHistoryItem';
import { ScanHistoryFilter } from '@/components/history/ScanHistoryFilter';

const ScanMap = Platform.OS === 'web'
  ? () => null
  : lazy(() => import('@/components/history/ScanMap').then(m => ({ default: m.ScanMap })));
import { colors } from '@/design/tokens/colors';
import { shadows } from '@/design/tokens/shadows';
import { spacing } from '@/design/tokens/spacing';
import { radius } from '@/design/tokens/radius';
import { typography } from '@/design/tokens/typography';
import { scanService } from '@/services/scan.service';
import type { ScanStatus } from '@/types/scan';
import type { ScanRecord } from '@/schemas/scan.schema';
import { useTranslation } from 'react-i18next';

export default function HistoryScreen(): React.JSX.Element {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ScanStatus | 'all'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const { t } = useTranslation();

  useFocusEffect(
    useCallback(() => {
      scanService.getHistory().then(setScans).catch(() => {});
    }, []),
  );

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
        <Text variant="heading">{t('history.title')}</Text>
      </View>

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <View style={styles.searchIconBox}>
            <Magnifer size={16} color={colors.textMuted} />
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder={t('history.searchProduct')}
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {/* View mode toggle */}
      <View style={styles.toggleContainer}>
        <Toggle
          options={[
            { label: t('history.listView'), value: 'list' },
            { label: t('history.mapView'), value: 'map' },
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
                  <Box size={40} color={colors.textMuted} />
                </View>
                <Text variant="body" color={colors.textSecondary}>
                  {t('history.emptyState')}
                </Text>
              </View>
            }
          />
        </>
      ) : (
        <Suspense fallback={null}>
          <ScanMap scans={filteredScans} />
        </Suspense>
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.section,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  searchContainer: {
    paddingHorizontal: spacing.section,
    marginBottom: spacing.sm,
  },
  toggleContainer: {
    paddingHorizontal: spacing.section,
    marginBottom: spacing.lg,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    height: 48,
    ...shadows.sm,
  } as ViewStyle,
  searchIconBox: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInput: {
    flex: 1,
    fontSize: typography.sizes.md,
    color: colors.textPrimary,
    paddingVertical: 0,
    fontWeight: '500',
    fontFamily: typography.fonts.body,
  },
  filterContainer: {
    paddingHorizontal: spacing.section,
    marginBottom: spacing.lg,
  },
  listContent: {
    paddingHorizontal: spacing.section,
    paddingBottom: 100,
  },
  separator: {
    height: spacing.md,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: spacing.lg,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  } as ViewStyle,
});
