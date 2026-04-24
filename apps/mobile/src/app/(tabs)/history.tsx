import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HistoryHeader } from '@/components/history/HistoryHeader';
import { HistorySearchBar } from '@/components/history/HistorySearchBar';
import {
  HistoryFilterChips,
  type HistoryFilterOption,
} from '@/components/history/HistoryFilterChips';
import { HistoryDateGroup } from '@/components/history/HistoryDateGroup';
import { HistoryEmpty } from '@/components/history/HistoryEmpty';
import { useTabBarSpacing } from '@/hooks/useTabBarSpacing';
import { colors } from '@/design/tokens/colors';
import { spacing } from '@/design/tokens/spacing';
import { scanService } from '@/services/scan.service';
import type { ScanRecord, ScanStatus } from '@/schemas/scan.schema';

type Filter = ScanStatus | 'all';

const FILTERS: HistoryFilterOption<Filter>[] = [
  { id: 'all', label: 'All' },
  { id: 'matched', label: 'Matched' },
  { id: 'partial', label: 'Partial' },
  { id: 'no_match', label: 'No match' },
];

interface DateGroup {
  date: string;
  items: ScanRecord[];
}

function groupByDate(scans: ScanRecord[]): DateGroup[] {
  const groups = new Map<string, ScanRecord[]>();
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  for (const scan of scans) {
    const d = new Date(scan.scannedAt || Date.now());
    let label: string;
    if (d.toDateString() === today.toDateString()) {
      label = 'Today';
    } else if (d.toDateString() === yesterday.toDateString()) {
      label = 'Yesterday';
    } else {
      label = d.toLocaleDateString('en-US', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });
    }
    const existing = groups.get(label) ?? [];
    groups.set(label, [...existing, scan]);
  }
  return Array.from(groups.entries()).map(([date, items]) => ({ date, items }));
}

function filterScans(
  scans: ScanRecord[],
  filter: Filter,
  search: string,
): ScanRecord[] {
  const byFilter =
    filter === 'all' ? scans : scans.filter((s) => s.status === filter);
  const query = search.trim().toLowerCase();
  if (!query) return byFilter;
  return byFilter.filter(
    (s) =>
      s.scannedProduct?.name.toLowerCase().includes(query) ||
      s.scannedProduct?.brand.toLowerCase().includes(query) ||
      s.molydalMatch?.name.toLowerCase().includes(query),
  );
}

export default function HistoryScreen(): React.JSX.Element {
  const router = useRouter();
  const { contentPaddingBottom } = useTabBarSpacing();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      scanService
        .getHistory()
        .then(setScans)
        .catch(() => {});
    }, []),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await scanService.getHistory();
      setScans(data);
    } catch {
      // fail silently, user can retry
    } finally {
      setRefreshing(false);
    }
  }, []);

  const grouped = useMemo(
    () => groupByDate(filterScans(scans, filter, search)),
    [scans, filter, search],
  );

  const handleItemPress = useCallback(
    (id: string) => {
      router.push(`/product/${id}`);
    },
    [router],
  );

  const renderItem = useCallback(
    ({ item }: { item: DateGroup }) => (
      <HistoryDateGroup
        date={item.date}
        items={item.items}
        onItemPress={handleItemPress}
      />
    ),
    [handleItemPress],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <HistoryHeader />
      <HistorySearchBar value={search} onChangeText={setSearch} />
      <HistoryFilterChips
        options={FILTERS}
        value={filter}
        onChange={setFilter}
      />

      <FlatList
        data={grouped}
        keyExtractor={(item) => item.date}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: contentPaddingBottom },
        ]}
        renderItem={renderItem}
        ListEmptyComponent={<HistoryEmpty />}
        removeClippedSubviews={Platform.OS === 'android'}
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={8}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.red}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper1,
  },
  listContent: {
    paddingHorizontal: spacing.section,
  },
});
