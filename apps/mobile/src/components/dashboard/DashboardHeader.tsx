import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Wordmark3 } from '@/components/ui/Wordmark';
import { spacing } from '@/design/tokens/spacing';

export function DashboardHeader(): React.JSX.Element {
  return (
    <View style={styles.header}>
      <Wordmark3 size={18} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.section,
    paddingTop: spacing.sm,
    paddingBottom: 4,
  },
});
