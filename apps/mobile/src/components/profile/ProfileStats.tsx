import React from 'react';
import {
  View,
  StyleSheet,
  Text as RNText,
  type ViewStyle,
} from 'react-native';
import { shadows } from '@/design/tokens/shadows';
import { colors } from '@/design/tokens/colors';
import { radius } from '@/design/tokens/radius';
import { spacing } from '@/design/tokens/spacing';
import { typography } from '@/design/tokens/typography';

export interface ProfileStatItem {
  label: string;
  value: string;
}

interface ProfileStatsProps {
  items: ProfileStatItem[];
}

export function ProfileStats({ items }: ProfileStatsProps): React.JSX.Element {
  return (
    <View style={styles.grid}>
      {items.map((s) => (
        <View key={s.label} style={[styles.card, shadows.card as ViewStyle]}>
          <RNText style={styles.label}>{s.label}</RNText>
          <RNText style={styles.value}>{s.value}</RNText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: spacing.section,
    marginBottom: 24,
  },
  card: {
    flex: 1,
    padding: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.paper2,
    borderWidth: 1,
    borderColor: 'rgba(26,20,16,0.07)',
    alignItems: 'center',
  } as ViewStyle,
  label: {
    fontFamily: typography.fonts.sans,
    fontSize: 10,
    color: colors.ink2,
  },
  value: {
    fontFamily: typography.fonts.display,
    fontSize: 24,
    color: colors.ink,
    letterSpacing: -0.8,
    lineHeight: 28,
    marginTop: 4,
  },
});
