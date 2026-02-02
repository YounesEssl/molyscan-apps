import React from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, type ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Text, Card } from '@/components/ui';
import { NotificationBell } from '@/components/dashboard/NotificationBell';
import { StatCard } from '@/components/dashboard/StatCard';
import { RecentScans } from '@/components/dashboard/RecentScans';
import { PriceRequestCard } from '@/components/workflow/PriceRequestCard';
import { COLORS, GRADIENTS, SPACING, RADIUS, SHADOW } from '@/constants/theme';
import { useAuthStore } from '@/stores/auth.store';
import { useWorkflowStore } from '@/stores/workflow.store';
import { MOCK_USER } from '@/mocks/user.mock';
import { MOCK_SCANS } from '@/mocks/scans.mock';
import { hasPermission } from '@/utils/permissions';
import type { UserRole } from '@/schemas/auth.schema';

export default function DashboardScreen(): React.JSX.Element {
  const router = useRouter();
  const user = useAuthStore((s) => s.user) ?? MOCK_USER;
  const role = (user.role ?? 'commercial') as UserRole;
  const workflows = useWorkflowStore((s) => s.workflows);
  const pendingWorkflows = workflows.filter((w) => w.status === 'submitted' || w.status === 'under_review');

  const matchedCount = MOCK_SCANS.filter((s) => s.status === 'matched').length;
  const totalScans = MOCK_SCANS.length;

  return (
    <ScreenWrapper scroll padded={false}>
      {/* Hero */}
      <LinearGradient
        colors={[...GRADIENTS.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <SafeAreaView edges={['top']}>
          <View style={styles.heroContent}>
            <View style={styles.heroTop}>
              <View>
                <Text variant="body" color="rgba(255,255,255,0.7)">
                  Bonjour,
                </Text>
                <Text variant="heading" color={COLORS.surface}>
                  {user.firstName} {user.lastName}
                </Text>
                <Text variant="caption" color="rgba(255,255,255,0.6)">
                  {role === 'admin' ? 'Administrateur' : role === 'distributor' ? 'Distributeur' : 'Commercial terrain'}
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
          <StatCard icon="scan" label="Scans" value={totalScans.toString()} />
          <StatCard icon="checkmark-circle" label="Matchs" value={matchedCount.toString()} />
          <StatCard icon="git-branch" label="Demandes" value={workflows.length.toString()} />
        </ScrollView>

        {/* Quick actions */}
        <TouchableOpacity
          style={[styles.scanButton, SHADOW.primary as ViewStyle]}
          onPress={() => router.push('/(tabs)/scanner')}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[COLORS.accent, '#F59E0B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.scanButtonGradient}
          >
            <Ionicons name="scan" size={24} color={COLORS.surface} />
            <Text variant="body" color={COLORS.surface} style={styles.scanButtonText}>
              Scanner un produit
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Role-based shortcuts */}
        <View style={styles.shortcuts}>
          {hasPermission(role, 'canExportData') && (
            <ShortcutCard icon="analytics-outline" label="Export" onPress={() => router.push('/export')} />
          )}
          {hasPermission(role, 'canUpdateCRM') && (
            <ShortcutCard icon="mic-outline" label="Notes CRM" onPress={() => router.push('/voice-note')} />
          )}
          {hasPermission(role, 'canAccessChat') && (
            <ShortcutCard icon="sparkles-outline" label="Assistant IA" onPress={() => router.push('/(tabs)/chat')} />
          )}
        </View>

        {/* Pending workflows */}
        {pendingWorkflows.length > 0 && hasPermission(role, 'canRequestPrice') && (
          <View style={styles.section}>
            <Text variant="label" style={styles.sectionTitle}>
              Demandes de prix en cours
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

        <View style={styles.bottomSpacer} />
      </View>
    </ScreenWrapper>
  );
}

const ShortcutCard: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}> = ({ icon, label, onPress }) => (
  <TouchableOpacity style={[styles.shortcutCard, SHADOW.sm as ViewStyle]} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.shortcutIcon}>
      <Ionicons name={icon} size={22} color={COLORS.primary} />
    </View>
    <Text variant="caption" style={styles.shortcutLabel}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  hero: {
    paddingBottom: SPACING.xl,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  heroContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  content: {
    paddingHorizontal: SPACING.lg,
    marginTop: -SPACING.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  scanButton: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  scanButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md + 2,
  },
  scanButtonText: {
    fontWeight: '700',
    fontSize: 16,
  },
  shortcuts: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  shortcutCard: {
    flex: 1,
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
  },
  shortcutIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutLabel: {
    fontWeight: '600',
  },
  section: {
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  sectionTitle: {
    marginBottom: SPACING.xs,
  },
  bottomSpacer: {
    height: SPACING.xl,
  },
});
