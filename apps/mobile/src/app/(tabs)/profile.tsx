import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Switch, TouchableOpacity, Platform, type ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Text, Avatar, Card } from '@/components/ui';
import { StatusIndicator } from '@/components/ui/StatusIndicator';
import { SyncQueue } from '@/components/layout/SyncQueue';
import { COLORS, GRADIENTS, SPACING, RADIUS, SHADOW } from '@/constants/theme';
import { useAuthStore } from '@/stores/auth.store';
import { useOfflineStore } from '@/stores/offline.store';
import { useSync } from '@/hooks/useSync';
import { useAuth } from '@/hooks/useAuth';
import { scanService } from '@/services/scan.service';
import { hasPermission } from '@/utils/permissions';
import type { UserRole } from '@/schemas/auth.schema';
import type { ScanRecord } from '@/schemas/scan.schema';

export default function ProfileScreen(): React.JSX.Element {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? 'commercial') as UserRole;
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const { isOffline, setManualOffline } = useOfflineStore();
  const { syncNow } = useSync();
  const { logout } = useAuth();
  const [scans, setScans] = useState<ScanRecord[]>([]);

  useEffect(() => {
    scanService.getHistory().then(setScans).catch(() => {});
  }, []);

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const ROLE_LABELS: Record<string, string> = {
    commercial: 'Commercial terrain',
    distributor: 'Distributeur',
    admin: 'Administrateur',
  };

  const matchedCount = scans.filter((s) => s.status === 'matched').length;
  const matchRate = scans.length > 0 ? Math.round((matchedCount / scans.length) * 100) : 0;

  return (
    <View style={styles.root}>
      <ScreenWrapper scroll padded={false}>
        {/* Profile hero */}
        <LinearGradient
          colors={[...GRADIENTS.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroGradient}
        >
          <View style={styles.decoCircle} />
          <SafeAreaView edges={['top']}>
            <View style={styles.profileHeader}>
              <Avatar
                firstName={user?.firstName ?? ''}
                lastName={user?.lastName ?? ''}
                size={80}
              />
              <Text variant="heading" color={COLORS.surface} style={styles.name}>
                {user?.firstName} {user?.lastName}
              </Text>
              <Text variant="caption" color="rgba(255,255,255,0.7)">
                {ROLE_LABELS[role] ?? role}
              </Text>
            </View>
          </SafeAreaView>
        </LinearGradient>

        <View style={styles.content}>
          {/* Stats */}
          <Card style={styles.section}>
            <Text variant="label" style={styles.sectionTitle}>Statistiques</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text variant="heading" color={COLORS.primary}>{scans.length}</Text>
                <Text variant="caption" color={COLORS.textMuted}>Scans</Text>
              </View>
              <View style={styles.statItem}>
                <Text variant="heading" color={COLORS.success}>{matchedCount}</Text>
                <Text variant="caption" color={COLORS.textMuted}>Matchs</Text>
              </View>
              <View style={styles.statItem}>
                <Text variant="heading" color={COLORS.accent}>{matchRate}%</Text>
                <Text variant="caption" color={COLORS.textMuted}>Taux</Text>
              </View>
            </View>
          </Card>

          {/* Info section */}
          <Card style={styles.section}>
            <Text variant="label" style={styles.sectionTitle}>Informations</Text>
            <ProfileRow icon="mail-outline" label="Email" value={user?.email ?? ''} />
            <ProfileRow icon="call-outline" label="Téléphone" value={user?.phone ?? ''} />
            <ProfileRow icon="business-outline" label="Entreprise" value={user?.company ?? 'Molydal'} />
          </Card>

          {/* Preferences */}
          <Card style={styles.section}>
            <Text variant="label" style={styles.sectionTitle}>Préférences</Text>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={styles.rowIconBox}>
                  <Ionicons name="notifications-outline" size={18} color={COLORS.accent} />
                </View>
                <Text variant="body">Notifications</Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: COLORS.border, true: COLORS.accent + '60' }}
                thumbColor={notificationsEnabled ? COLORS.accent : '#f4f3f4'}
              />
            </View>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={[styles.rowIconBox, { backgroundColor: COLORS.warning + '15' }]}>
                  <Ionicons name="cloud-offline-outline" size={18} color={COLORS.warning} />
                </View>
                <Text variant="body">Mode hors-ligne</Text>
              </View>
              <Switch
                value={isOffline}
                onValueChange={setManualOffline}
                trackColor={{ false: COLORS.border, true: COLORS.warning + '60' }}
                thumbColor={isOffline ? COLORS.warning : '#f4f3f4'}
              />
            </View>
          </Card>

          {/* Sync queue */}
          <SyncQueue onSyncNow={syncNow} />

          {/* RBAC shortcuts */}
          {hasPermission(role, 'canExportData') && (
            <TouchableOpacity style={[styles.shortcutRow, SHADOW.sm as ViewStyle]} onPress={() => router.push('/export')}>
              <Ionicons name="analytics-outline" size={20} color={COLORS.primary} />
              <Text variant="body" style={styles.shortcutText}>Export & Intelligence</Text>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
          {hasPermission(role, 'canUpdateCRM') && (
            <TouchableOpacity style={[styles.shortcutRow, SHADOW.sm as ViewStyle]} onPress={() => router.push('/voice-note')}>
              <Ionicons name="mic-outline" size={20} color={COLORS.primary} />
              <Text variant="body" style={styles.shortcutText}>Notes vocales CRM</Text>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}

          {/* About */}
          <Card style={styles.section}>
            <Text variant="label" style={styles.sectionTitle}>À propos</Text>
            <ProfileRow icon="information-circle-outline" label="Version" value="1.0.0" />
            <ProfileRow icon="shield-checkmark-outline" label="Mentions légales" value="" />
          </Card>

          {/* Logout */}
          <TouchableOpacity style={[styles.logoutButton, SHADOW.sm as ViewStyle]} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
            <Text variant="body" color={COLORS.danger} style={styles.logoutText}>
              Se déconnecter
            </Text>
          </TouchableOpacity>

          <View style={styles.bottomSpacer} />
        </View>
      </ScreenWrapper>
    </View>
  );
}

interface ProfileRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}

const ProfileRow: React.FC<ProfileRowProps> = ({ icon, label, value }) => (
  <View style={profileRowStyles.row}>
    <View style={profileRowStyles.left}>
      <View style={profileRowStyles.iconBox}>
        <Ionicons name={icon} size={18} color={COLORS.primary} />
      </View>
      <Text variant="body">{label}</Text>
    </View>
    {value ? (
      <Text variant="caption" style={profileRowStyles.value}>{value}</Text>
    ) : null}
  </View>
);

const profileRowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm + 2,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    maxWidth: 180,
    textAlign: 'right',
  },
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  heroGradient: {
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xxl,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    overflow: 'hidden',
  },
  decoCircle: {
    position: 'absolute',
    top: -40,
    left: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    gap: SPACING.xs,
  },
  name: {
    marginTop: SPACING.sm,
  },
  content: {
    paddingHorizontal: SPACING.lg,
    marginTop: -SPACING.lg,
  },
  section: {
    marginBottom: SPACING.md,
    gap: SPACING.xs,
  },
  sectionTitle: {
    marginBottom: SPACING.xs,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: SPACING.sm,
  },
  statItem: {
    alignItems: 'center',
    gap: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm + 2,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  rowIconBox: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.accent + '10',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    marginBottom: SPACING.md,
  },
  shortcutText: {
    flex: 1,
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    marginTop: SPACING.sm,
    backgroundColor: COLORS.dangerLight,
    borderRadius: RADIUS.xl,
  },
  logoutText: {
    fontWeight: '700',
  },
  bottomSpacer: {
    height: SPACING.xl,
  },
});
