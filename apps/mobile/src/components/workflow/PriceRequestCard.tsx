import React from 'react';
import { View, TouchableOpacity, StyleSheet, type ViewStyle } from 'react-native';
import { Text, Card } from '@/components/ui';
import { StatusIndicator } from '@/components/ui/StatusIndicator';
import { COLORS, SPACING, SHADOW } from '@/constants/theme';
import type { PriceWorkflow } from '@/schemas/workflow.schema';
import { formatRelativeDate } from '@/utils/date';

interface PriceRequestCardProps {
  workflow: PriceWorkflow;
  onPress: () => void;
}

export const PriceRequestCard: React.FC<PriceRequestCardProps> = ({ workflow, onPress }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
    <Card style={styles.card}>
      <View style={styles.topRow}>
        <Text variant="body" style={styles.product}>{workflow.productName}</Text>
        <StatusIndicator status={workflow.status} />
      </View>
      <Text variant="caption" color={COLORS.textSecondary}>
        {workflow.clientName} — {workflow.quantity} {workflow.unit}
      </Text>
      <View style={styles.bottomRow}>
        <Text variant="caption" color={COLORS.textMuted}>
          Réf. {workflow.molydalRef}
        </Text>
        <Text variant="caption" color={COLORS.textMuted}>
          {formatRelativeDate(workflow.updatedAt)}
        </Text>
      </View>
      {workflow.requestedPrice && (
        <Text variant="caption" color={COLORS.accent} style={styles.price}>
          {workflow.requestedPrice.toFixed(2)} €/{workflow.unit}
          {workflow.approvedPrice ? ` → ${workflow.approvedPrice.toFixed(2)} €/${workflow.unit}` : ''}
        </Text>
      )}
    </Card>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  card: {
    gap: SPACING.xs,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  product: {
    fontWeight: '700',
    flex: 1,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  price: {
    fontWeight: '700',
    marginTop: 2,
  },
});
