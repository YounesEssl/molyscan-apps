import React from 'react';
import { View, StyleSheet, Text as RNText } from 'react-native';
import { colors } from '@/design/tokens/colors';
import { spacing } from '@/design/tokens/spacing';
import { typography } from '@/design/tokens/typography';

export interface ProductSpec {
  label: string;
  value: string;
}

interface ProductSpecsProps {
  specs: ProductSpec[];
  title?: string;
}

export function ProductSpecs({
  specs,
  title = 'Specifications',
}: ProductSpecsProps): React.JSX.Element | null {
  if (specs.length === 0) return null;

  return (
    <View style={styles.section}>
      <RNText style={styles.sectionTitle}>{title}</RNText>
      <View style={styles.grid}>
        {specs.map((s) => (
          <View key={s.label} style={styles.card}>
            <RNText style={styles.label}>{s.label}</RNText>
            <RNText style={styles.value}>{s.value}</RNText>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: spacing.section,
    marginTop: 20,
  },
  sectionTitle: {
    fontFamily: typography.fonts.sansSemibold,
    fontSize: 13,
    color: colors.ink,
    letterSpacing: -0.1,
    marginBottom: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  card: {
    width: '48%',
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.paper2,
    borderWidth: 1,
    borderColor: 'rgba(26,20,16,0.06)',
  },
  label: {
    fontFamily: typography.fonts.sans,
    fontSize: 11,
    color: colors.ink2,
    letterSpacing: -0.1,
  },
  value: {
    fontFamily: typography.fonts.mono,
    fontSize: 15,
    color: colors.ink,
    marginTop: 4,
    letterSpacing: -0.3,
  },
});
