import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  type ViewStyle,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { Microphone2 } from 'react-native-solar-icons/icons/bold-duotone';
import { AltArrowRight } from 'react-native-solar-icons/icons/bold';
import { Text } from '@/components/ui/Text';
import { colors } from '@/design/tokens/colors';
import { radius } from '@/design/tokens/radius';
import { spacing } from '@/design/tokens/spacing';
import { typography } from '@/design/tokens/typography';
import { haptic } from '@/lib/haptics';

interface VoiceNoteEntryCardProps {
  onPress: () => void;
  onHistoryPress?: () => void;
}

export function VoiceNoteEntryCard({
  onPress,
  onHistoryPress,
}: VoiceNoteEntryCardProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <View style={styles.card}>
      <LinearGradient
        colors={['#fff6e8', '#fff0df']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.header}>
        <LinearGradient
          colors={[colors.redVivid, colors.red]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconBox}
        >
          <Microphone2 size={22} color="#fff" />
        </LinearGradient>
        <View style={styles.text}>
          <Text style={styles.title}>{t('dashboard.crmNotes')}</Text>
          <Text style={styles.sub}>{t('dashboard.voiceNoteSub')}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.primaryAction}
          onPress={() => {
            haptic.medium();
            onPress();
          }}
          activeOpacity={0.88}
          accessibilityRole="button"
          accessibilityLabel={t('dashboard.voiceNoteCta')}
        >
          <Microphone2 size={18} color="#fff" />
          <Text style={styles.primaryActionText}>{t('dashboard.voiceNoteRecord')}</Text>
        </TouchableOpacity>

        {onHistoryPress && (
          <TouchableOpacity
            style={styles.secondaryAction}
            onPress={() => {
              haptic.light();
              onHistoryPress();
            }}
            activeOpacity={0.88}
            accessibilityRole="button"
            accessibilityLabel={t('dashboard.voiceNoteHistory')}
          >
            <Text style={styles.secondaryActionText}>{t('dashboard.voiceNoteHistory')}</Text>
            <AltArrowRight size={17} color={colors.ink3} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.section,
    marginTop: 22,
    padding: 18,
    borderRadius: radius.lg,
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(180,120,60,0.15)',
    overflow: 'hidden',
    position: 'relative',
  } as ViewStyle,
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.red,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 7,
    elevation: 4,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontFamily: typography.fonts.sansSemibold,
    color: colors.ink,
    letterSpacing: -0.2,
  },
  sub: {
    fontSize: 12,
    fontFamily: typography.fonts.sans,
    color: colors.ink2,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryAction: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.red,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
  },
  secondaryAction: {
    minHeight: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.paper2,
    borderWidth: 1,
    borderColor: 'rgba(26,20,16,0.09)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
  },
  primaryActionText: {
    fontSize: 13,
    fontFamily: typography.fonts.sansSemibold,
    color: '#fff',
  },
  secondaryActionText: {
    fontSize: 13,
    fontFamily: typography.fonts.sansSemibold,
    color: colors.ink,
  },
});
