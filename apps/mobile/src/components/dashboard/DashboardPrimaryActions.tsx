import React from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { Camera, Microphone2, Stars } from 'react-native-solar-icons/icons/bold-duotone';
import { AltArrowRight } from 'react-native-solar-icons/icons/bold';
import { Text } from '@/components/ui/Text';
import { colors } from '@/design/tokens/colors';
import { radius } from '@/design/tokens/radius';
import { spacing } from '@/design/tokens/spacing';
import { typography } from '@/design/tokens/typography';
import { haptic } from '@/lib/haptics';

interface DashboardPrimaryActionsProps {
  onScanPress: () => void;
  onAssistantPress: () => void;
  onVoicePress: () => void;
}

interface PrimaryActionCardProps {
  title: string;
  subtitle: string;
  accessibilityLabel: string;
  secondaryAccessibilityLabel: string;
  icon: React.ReactNode;
  secondaryIcon: React.ReactNode;
  backgroundColors: readonly [string, string];
  accentColors: readonly [string, string];
  accentColor: string;
  borderColor: string;
  onPress: () => void;
  onSecondaryPress: () => void;
}

function PrimaryActionCard({
  title,
  subtitle,
  accessibilityLabel,
  secondaryAccessibilityLabel,
  icon,
  secondaryIcon,
  backgroundColors,
  accentColors,
  accentColor,
  borderColor,
  onPress,
  onSecondaryPress,
}: PrimaryActionCardProps): React.JSX.Element {
  return (
    <View style={styles.shadowWrap}>
      <View style={[styles.card, { borderColor }]}>
        <LinearGradient colors={backgroundColors} style={StyleSheet.absoluteFill} />
        <View style={styles.content}>
          <Pressable
            style={({ pressed }) => [styles.mainAction, pressed && styles.pressed]}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
          >
            <LinearGradient colors={accentColors} style={styles.iconBox}>
              {icon}
            </LinearGradient>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </Pressable>
          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
              onPress={onSecondaryPress}
              accessibilityRole="button"
              accessibilityLabel={secondaryAccessibilityLabel}
            >
              {secondaryIcon}
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.arrowButton, { backgroundColor: accentColor }, pressed && styles.pressed]}
              onPress={onPress}
              accessibilityRole="button"
              accessibilityLabel={accessibilityLabel}
            >
              <AltArrowRight size={20} color="#fff" />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

export function DashboardPrimaryActions({
  onScanPress,
  onAssistantPress,
  onVoicePress,
}: DashboardPrimaryActionsProps): React.JSX.Element {
  const { t } = useTranslation();

  const openScan = () => {
    haptic.medium();
    onScanPress();
  };
  const openAssistant = () => {
    haptic.light();
    onAssistantPress();
  };
  const openVoice = () => {
    haptic.medium();
    onVoicePress();
  };

  return (
    <View style={styles.row}>
      <PrimaryActionCard
        title={t('dashboard.scanCardTitle')}
        subtitle={t('dashboard.scanCardSubtitle')}
        accessibilityLabel={t('dashboard.a11yScanCompetitor')}
        secondaryAccessibilityLabel={t('dashboard.a11yScanCompetitor')}
        icon={<Camera size={22} color="#fff" />}
        secondaryIcon={<Camera size={20} color={colors.red} />}
        backgroundColors={['#fff6e8', '#ffe0cf']}
        accentColors={[colors.redVivid, colors.red]}
        accentColor={colors.red}
        borderColor={colors.redBorder}
        onPress={openScan}
        onSecondaryPress={openScan}
      />
      <PrimaryActionCard
        title={t('dashboard.aiAssistant')}
        subtitle={t('dashboard.assistantCardSubtitle')}
        accessibilityLabel={t('dashboard.aiAssistant')}
        secondaryAccessibilityLabel={t('dashboard.a11yVoiceAssistant')}
        icon={<Stars size={22} color="#fff" />}
        secondaryIcon={<Microphone2 size={20} color={colors.purple} />}
        backgroundColors={['#f7f1ff', '#eee3ff']}
        accentColors={[colors.purpleVivid, colors.purple]}
        accentColor={colors.purple}
        borderColor="rgba(91,45,255,0.2)"
        onPress={openAssistant}
        onSecondaryPress={openVoice}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.section,
    marginTop: spacing.xl,
    alignItems: 'stretch',
  },
  shadowWrap: {
    flex: 1,
    borderRadius: radius.xl,
    backgroundColor: colors.paper2,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 4,
  } as ViewStyle,
  card: {
    flex: 1,
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
  },
  content: {
    flex: 1,
    minHeight: 226,
    padding: spacing.lg,
  },
  mainAction: {
    flex: 1,
    alignItems: 'flex-start',
  },
  pressed: {
    opacity: 0.72,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: typography.fonts.display,
    fontSize: 22,
    lineHeight: 25,
    color: colors.ink,
    letterSpacing: -0.6,
    marginTop: spacing.md,
  },
  subtitle: {
    fontFamily: typography.fonts.sans,
    fontSize: 12,
    lineHeight: 17,
    color: colors.ink2,
    marginTop: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  secondaryButton: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.paper2,
    borderWidth: 1,
    borderColor: colors.ink4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowButton: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
