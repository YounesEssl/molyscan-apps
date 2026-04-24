import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Aura } from '@/components/ui/Aura';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardGreeting } from '@/components/dashboard/DashboardGreeting';
import { HeroScanCard } from '@/components/dashboard/HeroScanCard';
import { StatRow, type StatItem } from '@/components/dashboard/StatRow';
import { RecentScansSection } from '@/components/dashboard/RecentScansSection';
import { PendingWorkflowsSection } from '@/components/dashboard/PendingWorkflowsSection';
import { AIEntryCard } from '@/components/dashboard/AIEntryCard';
import { colors } from '@/design/tokens/colors';
import { useAuthStore } from '@/stores/auth.store';
import { useWorkflowStore } from '@/stores/workflow.store';
import { scanService } from '@/services/scan.service';
import { workflowService } from '@/services/workflow.service';
import { useTabBarSpacing } from '@/hooks/useTabBarSpacing';
import type { ScanRecord } from '@/schemas/scan.schema';

export default function DashboardScreen(): React.JSX.Element {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const workflows = useWorkflowStore((s) => s.workflows);
  const setWorkflows = useWorkflowStore((s) => s.setWorkflows);
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const { contentPaddingBottom } = useTabBarSpacing();

  useEffect(() => {
    scanService
      .getHistory()
      .then(setScans)
      .catch(() => {});
    workflowService
      .getAll()
      .then(setWorkflows)
      .catch(() => {});
  }, [setWorkflows]);

  const matchedCount = scans.filter((s) => s.status === 'matched').length;
  const matchRate =
    scans.length > 0 ? Math.round((matchedCount / scans.length) * 100) : 0;
  const pendingWorkflows = workflows.filter(
    (w) => w.status === 'submitted' || w.status === 'under_review',
  );

  const stats: StatItem[] = [
    { label: 'Scans', value: String(scans.length) },
    ...(scans.length > 0
      ? [{ label: 'Taux match', value: `${matchRate}%`, accent: true }]
      : []),
    { label: 'Demandes', value: String(workflows.length) },
  ];

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ paddingBottom: contentPaddingBottom }}
      showsVerticalScrollIndicator={false}
    >
      <Aura
        width={380}
        height={380}
        color={colors.redVivid}
        opacity={0.22}
        style={{ top: -140, right: -80 }}
      />

      <SafeAreaView edges={['top']}>
        <DashboardHeader onBellPress={() => router.push('/notifications')} />
        <DashboardGreeting firstName={user?.firstName} />
      </SafeAreaView>

      <HeroScanCard onPress={() => router.push('/(tabs)/scanner')} />

      <StatRow items={stats} />

      <RecentScansSection
        scans={scans}
        onScanPress={(id) => router.push(`/product/${id}`)}
        onSeeAllPress={() => router.push('/(tabs)/history')}
      />

      <PendingWorkflowsSection
        workflows={pendingWorkflows}
        onPress={(id) => router.push(`/workflow/${id}`)}
      />

      <AIEntryCard onPress={() => router.push('/(tabs)/chat')} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.paper1,
  },
});
