import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Header } from '@/components/layout/Header';
import { Text, Card } from '@/components/ui';
import { StatusIndicator } from '@/components/ui/StatusIndicator';
import { WorkflowTimeline } from '@/components/workflow/WorkflowTimeline';
import { COLORS, SPACING } from '@/constants/theme';
import { useWorkflowStore } from '@/stores/workflow.store';

export default function WorkflowDetailScreen(): React.JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const workflow = useWorkflowStore((s) => s.workflows.find((w) => w.id === id));

  if (!workflow) {
    return (
      <ScreenWrapper>
        <Header title="Demande" showBack />
        <View style={styles.empty}>
          <Text variant="body" color={COLORS.textSecondary}>Demande introuvable</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper scroll>
      <Header title="Détail demande" showBack />
      <View style={styles.content}>
        <Card style={styles.infoCard}>
          <View style={styles.topRow}>
            <Text variant="heading">{workflow.productName}</Text>
            <StatusIndicator status={workflow.status} />
          </View>
          <Text variant="caption" color={COLORS.textSecondary}>
            Réf. {workflow.molydalRef}
          </Text>
          <View style={styles.detailRow}>
            <DetailItem label="Client" value={workflow.clientName} />
            <DetailItem label="Quantité" value={`${workflow.quantity} ${workflow.unit}`} />
          </View>
          {workflow.requestedPrice && (
            <View style={styles.detailRow}>
              <DetailItem label="Prix demandé" value={`${workflow.requestedPrice.toFixed(2)} €/${workflow.unit}`} />
              {workflow.approvedPrice && (
                <DetailItem label="Prix validé" value={`${workflow.approvedPrice.toFixed(2)} €/${workflow.unit}`} />
              )}
            </View>
          )}
        </Card>

        <Text variant="label" style={styles.timelineTitle}>Historique</Text>
        <WorkflowTimeline steps={workflow.steps} />
      </View>
    </ScreenWrapper>
  );
}

const DetailItem: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.detailItem}>
    <Text variant="caption" color={COLORS.textMuted}>{label}</Text>
    <Text variant="body" style={styles.detailValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  content: {
    gap: SPACING.md,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCard: {
    gap: SPACING.sm,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    gap: SPACING.lg,
    marginTop: SPACING.xs,
  },
  detailItem: {
    flex: 1,
    gap: 2,
  },
  detailValue: {
    fontWeight: '600',
  },
  timelineTitle: {
    marginTop: SPACING.sm,
  },
});
