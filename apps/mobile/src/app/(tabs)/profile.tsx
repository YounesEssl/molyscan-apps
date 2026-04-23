import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Switch, TouchableOpacity, type ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Letter } from 'react-native-solar-icons/icons/bold-duotone';
import { Phone } from 'react-native-solar-icons/icons/bold-duotone';
import { Shop } from 'react-native-solar-icons/icons/bold-duotone';
import { Bell } from 'react-native-solar-icons/icons/bold-duotone';
import { CloundCross } from 'react-native-solar-icons/icons/bold-duotone';
import { ChartSquare } from 'react-native-solar-icons/icons/bold-duotone';
import { Microphone2 } from 'react-native-solar-icons/icons/bold-duotone';
import { InfoCircle } from 'react-native-solar-icons/icons/bold-duotone';
import { ShieldCheck } from 'react-native-solar-icons/icons/bold-duotone';
import { Logout2 } from 'react-native-solar-icons/icons/bold';
import { AltArrowRight } from 'react-native-solar-icons/icons/bold';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Text, Avatar, Card } from '@/components/ui';
import { StatusIndicator } from '@/components/ui/StatusIndicator';
import { SyncQueue } from '@/components/layout/SyncQueue';
import { colors } from '@/design/tokens/colors';
import { shadows } from '@/design/tokens/shadows';
import { spacing } from '@/design/tokens/spacing';
import { radius } from '@/design/tokens/radius';
import { useAuthStore } from '@/stores/auth.store';
import { useOfflineStore } from '@/stores/offline.store';
import { useSync } from '@/hooks/useSync';
import { useAuth } from '@/hooks/useAuth';
import { scanService } from '@/services/scan.service';
import { hasPermission } from '@/utils/permissions';
import type { UserRole } from '@/schemas/auth.schema';
import type { ScanRecord } from '@/schemas/scan.schema';
import { useTranslation } from 'react-i18next';

export default function ProfileScreen(): React.JSX.Element {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? 'commercial') as UserRole;
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const { manualOffline, setManualOffline } = useOfflineStore();
  const { syncNow } = useSync();
  const { logout } = useAuth();
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const { t } = useTranslation();

  useEffect(() => {
    scanService.getHistory().then(setScans).catch(() => {});
  }, []);

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const matchedCount = scans.filter((s) => s.status === 'matched').length;
  const matchRate = scans.length > 0 ? Math.round((matchedCount / scans.length) * 100) : 0;

  return (
    <View style={styles.root}>
      <ScreenWrapper scroll padded={false} tabSafe>
        {/* Profile hero */}
        <LinearGradient
          colors={[colors.red, colors.redLight]}
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
                imageUri={user?.avatarUrl}
                size={80}
              />
              <Text variant="heading" color={colors.textOnRed} style={styles.name}>
                {user?.firstName} {user?.lastName}
              </Text>
              <Text variant="caption" color="rgba(255,255,255,0.7)">
                {t('roles.' + role, role)}
              </Text>
            </View>
          </SafeAreaView>
        </LinearGradient>

        <View style={styles.content}>
          {/* Stats */}
          <Card style={styles.section}>
            <Text variant="label" style={styles.sectionTitle}>{t('profile.statistics')}</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text variant="heading" color={colors.red}>{scans.length}</Text>
                <Text variant="caption" color={colors.textMuted}>{t('profile.scans')}</Text>
              </View>
              <View style={styles.statItem}>
                <Text variant="heading" color={colors.success}>{matchedCount}</Text>
                <Text variant="caption" color={colors.textMuted}>{t('profile.matches')}</Text>
              </View>
              <View style={styles.statItem}>
                <Text variant="heading" color={colors.red}>{matchRate}%</Text>
                <Text variant="caption" color={colors.textMuted}>{t('profile.rate')}</Text>
              </View>
            </View>
          </Card>

          {/* Info section */}
          <Card style={styles.section}>
            <Text variant="label" style={styles.sectionTitle}>{t('profile.information')}</Text>
            <ProfileRow icon={<Letter size={18} color={colors.red} />} label={t('profile.emailLabel')} value={user?.email ?? ''} />
            <ProfileRow icon={<Phone size={18} color={colors.red} />} label={t('profile.phone')} value={user?.phone ?? ''} />
            <ProfileRow icon={<Shop size={18} color={colors.red} />} label={t('profile.company')} value={user?.company ?? 'Molydal'} />
          </Card>

          {/* Preferences */}
          <Card style={styles.section}>
            <Text variant="label" style={styles.sectionTitle}>{t('profile.preferences')}</Text>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={styles.rowIconBox}>
                  <Bell size={18} color={colors.red} />
                </View>
                <Text variant="body">{t('profile.notifications')}</Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: colors.border, true: colors.red + '60' }}
                thumbColor={notificationsEnabled ? colors.red : '#f4f3f4'}
              />
            </View>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={[styles.rowIconBox, { backgroundColor: colors.warning + '15' }]}>
                  <CloundCross size={18} color={colors.warning} />
                </View>
                <Text variant="body">{t('profile.offlineMode')}</Text>
              </View>
              <Switch
                value={manualOffline}
                onValueChange={setManualOffline}
                trackColor={{ false: colors.border, true: colors.warning + '60' }}
                thumbColor={manualOffline ? colors.warning : '#f4f3f4'}
              />
            </View>
          </Card>

          {/* Sync queue */}
          <SyncQueue onSyncNow={syncNow} />

          {/* RBAC shortcuts */}
          {hasPermission(role, 'canExportData') && (
            <TouchableOpacity style={styles.shortcutRow} onPress={() => router.push('/export')}>
              <ChartSquare size={20} color={colors.red} />
              <Text variant="body" style={styles.shortcutText}>{t('profile.exportIntelligence')}</Text>
              <AltArrowRight size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
          {hasPermission(role, 'canUpdateCRM') && (
            <TouchableOpacity style={styles.shortcutRow} onPress={() => router.push('/voice-note')}>
              <Microphone2 size={20} color={colors.red} />
              <Text variant="body" style={styles.shortcutText}>{t('profile.voiceNotesCRM')}</Text>
              <AltArrowRight size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}

          {/* About */}
          <Card style={styles.section}>
            <Text variant="label" style={styles.sectionTitle}>{t('profile.about')}</Text>
            <ProfileRow icon={<InfoCircle size={18} color={colors.red} />} label={t('profile.version')} value="1.0.0" />
            <ProfileRow icon={<ShieldCheck size={18} color={colors.red} />} label={t('profile.legalNotice')} value="" />
          </Card>

          {/* Logout */}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Logout2 size={20} color={colors.error} />
            <Text variant="body" color={colors.error} style={styles.logoutText}>
              {t('profile.logout')}
            </Text>
          </TouchableOpacity>

        </View>
      </ScreenWrapper>
    </View>
  );
}

interface ProfileRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

const ProfileRow: React.FC<ProfileRowProps> = ({ icon, label, value }) => (
  <View style={profileRowStyles.row}>
    <View style={profileRowStyles.left}>
      <View style={profileRowStyles.iconBox}>
        {icon}
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
    paddingVertical: spacing.sm + 2,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.redDim,
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
    backgroundColor: colors.background,
  },
  heroGradient: {
    paddingTop: spacing.lg,
    paddingBottom: 48,
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
    paddingVertical: spacing.xxl,
    gap: spacing.xs,
  },
  name: {
    marginTop: spacing.sm,
  },
  content: {
    paddingHorizontal: spacing.section,
    marginTop: -spacing.xxl,
  },
  section: {
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  sectionTitle: {
    marginBottom: spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.sm,
  },
  statItem: {
    alignItems: 'center',
    gap: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowIconBox: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.redDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
    ...shadows.sm,
  } as ViewStyle,
  shortcutText: {
    flex: 1,
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    marginTop: spacing.sm,
    backgroundColor: colors.redDim,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.red + '25',
  },
  logoutText: {
    fontWeight: '700',
  },
});
