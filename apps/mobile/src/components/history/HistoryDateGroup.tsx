import React from 'react';
import { View, StyleSheet, Text as RNText } from 'react-native';
import { HistoryItem } from '@/components/history/HistoryItem';
import { colors } from '@/design/tokens/colors';
import { typography } from '@/design/tokens/typography';
import type { ScanRecord } from '@/schemas/scan.schema';

interface HistoryDateGroupProps {
  date: string;
  items: ScanRecord[];
  onItemPress: (id: string) => void;
}

export function HistoryDateGroup({
  date,
  items,
  onItemPress,
}: HistoryDateGroupProps): React.JSX.Element {
  return (
    <View style={styles.group}>
      <RNText style={styles.date}>{date}</RNText>
      <View style={styles.items}>
        {items.map((s) => (
          <HistoryItem key={s.id} scan={s} onPress={() => onItemPress(s.id)} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    marginTop: 16,
    marginBottom: 22,
  },
  date: {
    fontFamily: typography.fonts.mono,
    fontSize: 10,
    color: colors.ink2,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  items: {
    gap: 8,
  },
});
