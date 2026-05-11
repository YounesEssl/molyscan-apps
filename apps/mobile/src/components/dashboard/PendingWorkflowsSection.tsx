import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  type ViewStyle,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Stars } from 'react-native-solar-icons/icons/bold-duotone';
import { Text } from '@/components/ui/Text';
import { Pill } from '@/components/ui/Pill';
import { colors } from '@/design/tokens/colors';
import { radius } from '@/design/tokens/radius';
import { spacing } from '@/design/tokens/spacing';
import { typography } from '@/design/tokens/typography';
import { haptic } from '@/lib/haptics';
import type { PriceWorkflow } from '@/schemas/workflow.schema';

interface PendingWorkflowsSectionProps {
  workflows: PriceWorkflow[];
  onPress: (id: string) => void;
}

const STATUS_KEY: Record<PriceWorkflow['status'], string> = {
  draft: 'workflow.statusShortDraft',
  submitted: 'workflow.statusShortPending',
  under_review: 'workflow.statusShortReview',
  approved: 'workflow.statusShortApproved',
  rejected: 'workflow.statusShortRejected',
};

export function PendingWorkflowsSection({
  workflows,
  onPress,
}: PendingWorkflowsSectionProps): React.JSX.Element | null {
  const { t } = useTranslation();
  if (workflows.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t('dashboard.pendingRequests')}</Text>
        <Pill variant="accent" size="sm">
          {t('dashboard.toReview', { count: workflows.length })}
        </Pill>
      </View>
      {workflows.slice(0, 2).map((w) => (
        <WorkflowRow key={w.id} workflow={w} onPress={() => onPress(w.id)} />
      ))}
    </View>
  );
}

interface WorkflowRowProps {
  workflow: PriceWorkflow;
  onPress: () => void;
}

function WorkflowRow({
  workflow,
  onPress,
}: WorkflowRowProps): React.JSX.Element {
  const { t } = useTranslation();
  const productName = workflow.productName || t('dashboard.defaultProduct');
  const clientName = workflow.clientName || t('dashboard.defaultClient');
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => {
        haptic.light();
        onPress();
      }}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={t('dashboard.a11yOpenWorkflow', { product: productName, client: clientName })}
    >
      <View style={styles.iconBox}>
        <Stars size={20} color={colors.red} />
      </View>
      <View style={styles.text}>
        <Text style={styles.name} numberOfLines={1}>
          {productName}
        </Text>
        <Text style={styles.sub}>{clientName}</Text>
      </View>
      <Pill variant="default" size="sm">
        {t(STATUS_KEY[workflow.status])}
      </Pill>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: spacing.section,
    marginTop: 22,
    gap: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: typography.fonts.sansSemibold,
    color: colors.ink,
    letterSpacing: -0.2,
  },
  card: {
    padding: 14,
    paddingHorizontal: 16,
    borderRadius: radius.lg,
    backgroundColor: colors.paper2,
    borderWidth: 1,
    borderColor: 'rgba(26,20,16,0.07)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowColor: '#3c2814',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  } as ViewStyle,
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,59,48,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 14,
    fontFamily: typography.fonts.sansSemibold,
    color: colors.ink,
    letterSpacing: -0.2,
  },
  sub: {
    fontSize: 12,
    fontFamily: typography.fonts.sans,
    color: colors.ink2,
    marginTop: 3,
  },
});
