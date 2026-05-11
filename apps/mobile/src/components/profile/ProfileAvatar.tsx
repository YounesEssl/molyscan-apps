import React from 'react';
import { View, StyleSheet, Text as RNText } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { Pill } from '@/components/ui/Pill';
import { colors } from '@/design/tokens/colors';
import { spacing } from '@/design/tokens/spacing';
import { typography } from '@/design/tokens/typography';

interface ProfileAvatarProps {
  initials: string;
  fullName: string;
  role?: string;
  scanCount?: number;
  matchRate?: number;
}

export function ProfileAvatar({
  initials,
  fullName,
  role,
  scanCount = 0,
  matchRate = 0,
}: ProfileAvatarProps): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <View style={styles.section}>
      <LinearGradient
        colors={[colors.redVivid, colors.red]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.avatar}
      >
        <RNText style={styles.initials}>{initials}</RNText>
      </LinearGradient>

      <RNText style={styles.name}>{fullName}</RNText>
      {role ? <RNText style={styles.role}>{role}</RNText> : null}

      {scanCount > 0 ? (
        <View style={styles.pills}>
          <Pill variant="default" size="sm">
            {t('profile.pillScanCount', { count: scanCount })}
          </Pill>
          {matchRate > 0 ? (
            <Pill variant="accent" size="sm">
              {t('profile.pillMatchRate', { percent: matchRate })}
            </Pill>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 24,
    paddingHorizontal: spacing.section,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.red,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  initials: {
    fontFamily: typography.fonts.display,
    fontSize: 34,
    color: '#fff',
    letterSpacing: -1,
  },
  name: {
    fontFamily: typography.fonts.display,
    fontSize: 28,
    color: colors.ink,
    letterSpacing: -0.8,
    marginTop: 14,
  },
  role: {
    fontFamily: typography.fonts.sans,
    fontSize: 12,
    color: colors.ink2,
    marginTop: 4,
  },
  pills: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
  },
});
