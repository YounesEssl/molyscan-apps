import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/ui';
import { COLORS, SPACING, RADIUS } from '@/constants/theme';

interface ConfidenceIndicatorProps {
  score: number;
  compact?: boolean;
}

function getScoreColor(score: number): string {
  if (score >= 85) return COLORS.success;
  if (score >= 60) return COLORS.warning;
  return COLORS.danger;
}

export const ConfidenceIndicator: React.FC<ConfidenceIndicatorProps> = ({
  score,
  compact = false,
}) => {
  const color = getScoreColor(score);

  if (compact) {
    return (
      <View style={[styles.compactBadge, { backgroundColor: color + '15' }]}>
        <Text variant="caption" style={{ color, fontWeight: '800', fontSize: 11 }}>
          {score}%
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text variant="label">Confiance</Text>
        <Text variant="caption" style={[styles.score, { color }]}>
          {score}%
        </Text>
      </View>
      <View style={styles.track}>
        <View
          style={[styles.fill, { width: `${score}%`, backgroundColor: color }]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: SPACING.xs,
    marginTop: SPACING.sm,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  score: {
    fontWeight: '800',
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.background,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
  compactBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
});
