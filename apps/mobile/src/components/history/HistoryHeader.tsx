import React from 'react';
import { View, StyleSheet, Text as RNText } from 'react-native';
import { colors } from '@/design/tokens/colors';
import { spacing } from '@/design/tokens/spacing';
import { typography } from '@/design/tokens/typography';

interface HistoryHeaderProps {
  title?: string;
}

export function HistoryHeader({
  title = 'Historique',
}: HistoryHeaderProps): React.JSX.Element {
  return (
    <View style={styles.header}>
      <RNText style={styles.title}>{title}</RNText>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.section,
    paddingTop: spacing.sm,
    paddingBottom: 4,
  },
  title: {
    fontFamily: typography.fonts.display,
    fontSize: 44,
    color: colors.ink,
    letterSpacing: -1.2,
    lineHeight: 46,
  },
});
