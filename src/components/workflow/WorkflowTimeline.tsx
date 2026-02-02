import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/ui';
import { StatusIndicator } from '@/components/ui/StatusIndicator';
import { COLORS, SPACING } from '@/constants/theme';
import type { WorkflowStep } from '@/schemas/workflow.schema';
import { formatFullDate } from '@/utils/date';

interface WorkflowTimelineProps {
  steps: WorkflowStep[];
}

export const WorkflowTimeline: React.FC<WorkflowTimelineProps> = ({ steps }) => (
  <View style={styles.container}>
    {steps.map((step, i) => (
      <View key={i} style={styles.step}>
        <View style={styles.lineContainer}>
          <View style={[styles.dot, { backgroundColor: i === steps.length - 1 ? COLORS.accent : COLORS.primary }]} />
          {i < steps.length - 1 && <View style={styles.line} />}
        </View>
        <View style={styles.content}>
          <View style={styles.stepHeader}>
            <StatusIndicator status={step.status} />
            <Text variant="caption" color={COLORS.textMuted}>
              {formatFullDate(step.date)}
            </Text>
          </View>
          <Text variant="caption" color={COLORS.textSecondary}>
            Par {step.actor}
          </Text>
          {step.comment && (
            <Text variant="body" style={styles.comment}>
              {step.comment}
            </Text>
          )}
        </View>
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  container: {
    gap: 0,
  },
  step: {
    flexDirection: 'row',
    gap: SPACING.md,
    minHeight: 60,
  },
  lineContainer: {
    width: 20,
    alignItems: 'center',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: COLORS.border,
    marginVertical: 4,
  },
  content: {
    flex: 1,
    gap: 2,
    paddingBottom: SPACING.md,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  comment: {
    marginTop: 4,
    fontStyle: 'italic',
  },
});
