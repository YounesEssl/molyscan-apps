import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text as RNText } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Aura } from '@/components/ui/Aura';
import { ProfileAvatar } from '@/components/profile/ProfileAvatar';
import {
  ProfileStats,
  type ProfileStatItem,
} from '@/components/profile/ProfileStats';
import { ProfileSettings } from '@/components/profile/ProfileSettings';
import { useTabBarSpacing } from '@/hooks/useTabBarSpacing';
import { colors } from '@/design/tokens/colors';
import { typography } from '@/design/tokens/typography';
import { useAuthStore } from '@/stores/auth.store';
import { useAuth } from '@/hooks/useAuth';
import { scanService } from '@/services/scan.service';
import type { ScanRecord } from '@/schemas/scan.schema';

export default function ProfileScreen(): React.JSX.Element {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { logout } = useAuth();
  const { contentPaddingBottom } = useTabBarSpacing();
  const [scans, setScans] = useState<ScanRecord[]>([]);

  useEffect(() => {
    scanService
      .getHistory()
      .then(setScans)
      .catch(() => {});
  }, []);

  const matchedCount = scans.filter((s) => s.status === 'matched').length;
  const matchRate =
    scans.length > 0 ? Math.round((matchedCount / scans.length) * 100) : 0;
  const initials =
    `${user?.firstName?.[0] ?? '?'}${user?.lastName?.[0] ?? ''}`.toUpperCase();
  const fullName = user ? `${user.firstName} ${user.lastName}` : '';

  const stats: ProfileStatItem[] = [
    { label: 'Scans', value: String(scans.length) },
    { label: 'Matchs', value: String(matchedCount) },
    { label: 'Taux', value: `${matchRate}%` },
  ];

  const handleLogout = async (): Promise<void> => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Aura
        width={400}
        height={300}
        color={colors.redVivid}
        opacity={0.14}
        style={{ top: -80, left: -80 }}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: contentPaddingBottom }}
      >
        <ProfileAvatar
          initials={initials}
          fullName={fullName}
          role={user?.role}
          scanCount={scans.length}
          matchRate={matchRate}
        />

        {scans.length > 0 ? <ProfileStats items={stats} /> : null}

        <ProfileSettings onLogout={handleLogout} />

        <RNText style={styles.version}>MolyScan v1.0.0</RNText>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper1,
    overflow: 'hidden',
  },
  version: {
    fontFamily: typography.fonts.mono,
    fontSize: 10,
    color: colors.ink3,
    textAlign: 'center',
    letterSpacing: 1,
    paddingBottom: 8,
  },
});
