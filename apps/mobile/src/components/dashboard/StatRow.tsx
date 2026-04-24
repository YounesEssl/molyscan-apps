import React from 'react';
import {
  View,
  StyleSheet,
  Text as RNText,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/ui/Text';
import { colors } from '@/design/tokens/colors';
import { radius } from '@/design/tokens/radius';
import { spacing } from '@/design/tokens/spacing';
import { typography } from '@/design/tokens/typography';

export interface StatItem {
  label: string;
  value: string;
  trend?: string;
  trendUp?: boolean;
  accent?: boolean;
}

interface StatRowProps {
  items: StatItem[];
}

export function StatRow({ items }: StatRowProps): React.JSX.Element {
  return (
    <View style={styles.row}>
      {items.map((item, i) => (
        <StatCard key={`${item.label}-${i}`} {...item} />
      ))}
    </View>
  );
}

function StatCard({
  label,
  value,
  trend,
  trendUp,
  accent,
}: StatItem): React.JSX.Element {
  if (accent) {
    return (
      <LinearGradient
        colors={['#fff2ef', '#fde8e3']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, styles.cardAccent]}
      >
        <Text style={styles.label}>{label}</Text>
        <RNText style={[styles.value, { color: colors.red }]}>{value}</RNText>
        {trend ? (
          <Text style={[styles.trend, trendUp ? { color: colors.ok } : null]}>
            {trend}
          </Text>
        ) : null}
      </LinearGradient>
    );
  }
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <RNText style={styles.value}>{value}</RNText>
      {trend ? (
        <Text style={[styles.trend, trendUp ? { color: colors.ok } : null]}>
          {trend}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: spacing.section,
    paddingTop: 18,
  },
  card: {
    flex: 1,
    padding: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.paper2,
    borderWidth: 1,
    borderColor: 'rgba(26,20,16,0.07)',
    shadowColor: '#3c2814',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  } as ViewStyle,
  cardAccent: {
    borderColor: 'rgba(255,59,48,0.2)',
  },
  label: {
    fontSize: 10,
    fontFamily: typography.fonts.sans,
    color: colors.ink2,
    letterSpacing: -0.1,
  },
  value: {
    fontFamily: typography.fonts.display,
    fontSize: 28,
    color: colors.ink,
    letterSpacing: -1,
    lineHeight: 32,
    marginTop: 6,
  },
  trend: {
    fontSize: 10,
    fontFamily: typography.fonts.sans,
    color: colors.ink2,
    marginTop: 6,
    letterSpacing: -0.1,
  },
});
