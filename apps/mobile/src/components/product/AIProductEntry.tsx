import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text as RNText,
  type ViewStyle,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { Stars } from 'react-native-solar-icons/icons/bold-duotone';
import { AltArrowRight } from 'react-native-solar-icons/icons/bold';
import { colors } from '@/design/tokens/colors';
import { radius } from '@/design/tokens/radius';
import { spacing } from '@/design/tokens/spacing';
import { typography } from '@/design/tokens/typography';
import { haptic } from '@/lib/haptics';

interface AIProductEntryProps {
  productName: string;
  onPress: () => void;
  disabled?: boolean;
}

export function AIProductEntry({
  productName,
  onPress,
  disabled = false,
}: AIProductEntryProps): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <View style={styles.section}>
      <TouchableOpacity
        style={styles.card}
        onPress={() => {
          haptic.medium();
          onPress();
        }}
        disabled={disabled}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={t('product.a11yAskAI', { name: productName })}
        accessibilityState={{ disabled }}
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
          <RNText style={styles.title}>{t('product.askAITitle')}</RNText>
          <RNText style={styles.sub}>{t('product.askAISub', { name: productName })}</RNText>
        </View>
        <AltArrowRight size={16} color={colors.ink3} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: spacing.section,
    marginTop: 20,
  },
  card: {
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
    width: 42,
    height: 42,
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
  },
  title: {
    fontFamily: typography.fonts.sansSemibold,
    fontSize: 14,
    color: colors.ink,
    letterSpacing: -0.2,
  },
  sub: {
    fontFamily: typography.fonts.sans,
    fontSize: 12,
    color: colors.ink2,
    marginTop: 2,
    letterSpacing: -0.1,
  },
});
