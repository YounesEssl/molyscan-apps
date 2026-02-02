import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS } from '@/constants/theme';

interface CompetitorBadgeProps {
  brand: string;
}

export const CompetitorBadge: React.FC<CompetitorBadgeProps> = ({ brand }) => {
  return (
    <View style={styles.container}>
      <Ionicons name="business-outline" size={14} color={COLORS.textSecondary} />
      <Text style={styles.text}>{brand}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: SPACING.xs + 1,
    borderRadius: RADIUS.full,
    backgroundColor: '#F1F3F5',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
});
