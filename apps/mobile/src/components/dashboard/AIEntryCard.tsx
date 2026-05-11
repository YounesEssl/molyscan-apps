import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  type ViewStyle,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { Stars } from 'react-native-solar-icons/icons/bold-duotone';
import { AltArrowRight } from 'react-native-solar-icons/icons/bold';
import { Text } from '@/components/ui/Text';
import { colors } from '@/design/tokens/colors';
import { radius } from '@/design/tokens/radius';
import { spacing } from '@/design/tokens/spacing';
import { typography } from '@/design/tokens/typography';
import { haptic } from '@/lib/haptics';

interface AIEntryCardProps {
  onPress: () => void;
  title?: string;
  subtitle?: string;
}

export function AIEntryCard({
  onPress,
  title,
  subtitle,
}: AIEntryCardProps): React.JSX.Element {
  const { t } = useTranslation();
  const resolvedTitle = title ?? t('dashboard.aiAssistant');
  const resolvedSubtitle = subtitle ?? t('dashboard.aiAssistantSub');
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => {
        haptic.light();
        onPress();
      }}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`${resolvedTitle} : ${resolvedSubtitle}`}
    >
      <LinearGradient
        colors={['#fff6e8', '#fff0df']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={[colors.purpleVivid, colors.purple]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.iconBox}
      >
        <Stars size={20} color="#fff" />
      </LinearGradient>
      <View style={styles.text}>
        <Text style={styles.title}>{resolvedTitle}</Text>
        <Text style={styles.sub}>{resolvedSubtitle}</Text>
      </View>
      <AltArrowRight size={16} color={colors.ink3} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.section,
    marginTop: 22,
    padding: 18,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(180,120,60,0.15)',
    overflow: 'hidden',
    position: 'relative',
  } as ViewStyle,
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#5b2dff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
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
});
