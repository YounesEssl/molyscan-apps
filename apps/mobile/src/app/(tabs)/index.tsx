import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, type ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChartSquare } from 'react-native-solar-icons/icons/bold-duotone';
import { Microphone2 } from 'react-native-solar-icons/icons/bold-duotone';
import { Stars } from 'react-native-solar-icons/icons/bold-duotone';
import { QrCode } from 'react-native-solar-icons/icons/bold-duotone';
import { CheckCircle } from 'react-native-solar-icons/icons/bold-duotone';
import { Route } from 'react-native-solar-icons/icons/bold-duotone';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Text, Card, ScanFAB } from '@/components/ui';
import { NotificationBell } from '@/components/dashboard/NotificationBell';
import { StatCard } from '@/components/dashboard/StatCard';
import { RecentScans } from '@/components/dashboard/RecentScans';
import { PriceRequestCard } from '@/components/workflow/PriceRequestCard';
import { colors } from '@/design/tokens/colors';
import { shadows } from '@/design/tokens/shadows';
import { spacing } from '@/design/tokens/spacing';
import { radius } from '@/design/tokens/radius';
import { useAuthStore } from '@/stores/auth.store';
import { useWorkflowStore } from '@/stores/workflow.store';
import { scanService } from '@/services/scan.service';
import { workflowService } from '@/services/workflow.service';
import { hasPermission } from '@/utils/permissions';
import type { UserRole } from '@/schemas/auth.schema';
import type { ScanRecord } from '@/schemas/scan.schema';
import { useTranslation } from 'react-i18next';

export default function DashboardScreen(): React.JSX.Element {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? 'commercial') as UserRole;
  const workflows = useWorkflowStore((s) => s.workflows);
  const setWorkflows = useWorkflowStore((s) => s.setWorkflows);
  const pendingWorkflows = workflows.filter((w) => w.status === 'submitted' || w.status === 'under_review');

  const [scans, setScans] = useState<ScanRecord[]>([]);
  const { t } = useTranslation();

  useEffect(() => {
    scanService.getHistory().then(setScans).catch(() => {});
    workflowService.getAll().then(setWorkflows).catch(() => {});
  }, []);

  const matchedCount = scans.filter((s) => s.status === 'matched').length;
  const totalScans = scans.length;

  return (
    <ScreenWrapper scroll padded={false} tabSafe>
      {/* Hero */}
      <LinearGradient
        colors={[colors.red, colors.redLight]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <SafeAreaView edges={['top']}>
          <View style={styles.heroContent}>
            <View style={styles.heroTop}>
              <View>
                <Text variant="body" color="rgba(255,255,255,0.7)">
                  {t('dashboard.greeting')}
                </Text>
                <Text variant="heading" color={colors.textOnRed}>
                  {user?.firstName} {user?.lastName}
                </Text>
                <Text variant="caption" color="rgba(255,255,255,0.6)">
                  {t('roles.' + role)}
                </Text>
              </View>
              <NotificationBell onPress={() => router.push('/notifications')} />
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <View style={styles.content}>
        {/* Stats */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statsRow}
        >
          <StatCard
            icon={<QrCode size={22} color={colors.red} />}
            label={t('dashboard.scans')}
            value={totalScans.toString()}
          />
          <StatCard
            icon={<CheckCircle size={22} color={colors.matched} />}
            label={t('dashboard.matches')}
            value={matchedCount.toString()}
            color={colors.matched}
          />
          <StatCard
            icon={<Route size={22} color={colors.info} />}
            label={t('dashboard.requests')}
            value={workflows.length.toString()}
            color={colors.info}
          />
        </ScrollView>

        {/* Scan FAB */}
        <View style={styles.fabContainer}>
          <ScanFAB onPress={() => router.push('/(tabs)/scanner')} />
          <Text variant="subheading" style={styles.fabLabel}>
            {t('dashboard.scanProduct')}
          </Text>
        </View>

        {/* Role-based shortcuts */}
        <View style={styles.shortcuts}>
          {hasPermission(role, 'canExportData') && (
            <ShortcutCard
              icon={<ChartSquare size={22} color={colors.red} />}
              label={t('dashboard.export')}
              onPress={() => router.push('/export')}
            />
          )}
          {hasPermission(role, 'canUpdateCRM') && (
            <ShortcutCard
              icon={<Microphone2 size={22} color={colors.red} />}
              label={t('dashboard.crmNotes')}
              onPress={() => router.push('/voice-note')}
            />
          )}
          {hasPermission(role, 'canAccessChat') && (
            <ShortcutCard
              icon={<Stars size={22} color={colors.red} />}
              label={t('dashboard.aiAssistant')}
              onPress={() => router.push('/(tabs)/chat')}
            />
          )}
        </View>

        {/* Pending workflows */}
        {pendingWorkflows.length > 0 && hasPermission(role, 'canRequestPrice') && (
          <View style={styles.section}>
            <Text variant="label" style={styles.sectionTitle}>
              {t('dashboard.pendingPriceRequests')}
            </Text>
            {pendingWorkflows.slice(0, 3).map((wf) => (
              <PriceRequestCard
                key={wf.id}
                workflow={wf}
                onPress={() => router.push(`/workflow/${wf.id}`)}
              />
            ))}
          </View>
        )}

        {/* Recent scans */}
        <RecentScans />

      </View>
    </ScreenWrapper>
  );
}

const ShortcutCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}> = ({ icon, label, onPress }) => (
  <TouchableOpacity style={styles.shortcutCard} onPress={onPress} activeOpacity={0.85}>
    <View style={styles.shortcutIcon}>
      {icon}
    </View>
    <Text variant="caption" style={styles.shortcutLabel}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  hero: {
    paddingBottom: spacing.xxxl,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  heroContent: {
    paddingHorizontal: spacing.section,
    paddingTop: spacing.sm,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  content: {
    paddingHorizontal: spacing.section,
    marginTop: -spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  fabContainer: {
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  fabLabel: {
    textAlign: 'center',
  },
  shortcuts: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xxl,
  },
  shortcutCard: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  } as ViewStyle,
  shortcutIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.redDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutLabel: {
    fontWeight: '600',
    textAlign: 'center',
  },
  section: {
    marginBottom: spacing.xxl,
    gap: spacing.sm,
  },
  sectionTitle: {
    marginBottom: spacing.xs,
  },
});
