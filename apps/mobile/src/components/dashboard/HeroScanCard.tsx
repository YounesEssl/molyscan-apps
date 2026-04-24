import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text as RNText,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Bolt } from 'react-native-solar-icons/icons/bold-duotone';
import { Camera } from 'react-native-solar-icons/icons/bold-duotone';
import { Microphone2 } from 'react-native-solar-icons/icons/bold-duotone';
import { AltArrowRight } from 'react-native-solar-icons/icons/bold';
import { Text } from '@/components/ui/Text';
import { Aura } from '@/components/ui/Aura';
import { colors } from '@/design/tokens/colors';
import { radius } from '@/design/tokens/radius';
import { spacing } from '@/design/tokens/spacing';
import { typography } from '@/design/tokens/typography';
import { haptic } from '@/lib/haptics';

interface HeroScanCardProps {
  onPress: () => void;
}

const MODE_ICONS = [Camera, Microphone2];

export function HeroScanCard({ onPress }: HeroScanCardProps): React.JSX.Element {
  return (
    // Outer: shadow only, NO overflow hidden (iOS would clip the shadow)
    <View style={styles.shadowWrap}>
      <TouchableOpacity
        onPress={() => {
          haptic.medium();
          onPress();
        }}
        activeOpacity={0.92}
        style={styles.clipWrap}
        accessibilityRole="button"
        accessibilityLabel="Scanner un produit concurrent"
      >
        <LinearGradient
          colors={['#fff6e8', '#ffe8dc', '#ffd7c4']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Aura
          width={260}
          height={260}
          color={colors.redVivid}
          opacity={0.45}
          style={{ top: -60, right: -40 }}
        />
        <Aura
          width={180}
          height={180}
          color="#ffb464"
          opacity={0.5}
          style={{ bottom: -40, left: -20 }}
        />

        <View style={styles.heroInner}>
          <View style={styles.accentPill}>
            <Bolt size={11} color={colors.red} />
            <RNText style={styles.accentPillText}>Action principale</RNText>
          </View>

          <RNText style={styles.heroTitle}>
            {'Scanner un produit\n'}
            <RNText style={styles.heroTitleItalic}>concurrent</RNText>
          </RNText>
          <Text style={styles.heroSubtitle}>Photo · Vocal</Text>

          <View style={styles.heroBottom}>
            <View style={styles.heroIcons}>
              {MODE_ICONS.map((Icon, i) => (
                <View key={i} style={styles.heroIconBtn}>
                  <Icon size={16} color={colors.ink} />
                </View>
              ))}
            </View>
            <LinearGradient
              colors={[colors.redVivid, colors.red]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroArrowBtn}
            >
              <AltArrowRight size={20} color="#fff" />
            </LinearGradient>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  shadowWrap: {
    marginHorizontal: spacing.section,
    marginTop: 24,
    borderRadius: radius.xxl,
    backgroundColor: '#fff6e8',
    // iOS shadow (not clipped because no overflow:hidden here)
    shadowColor: colors.red,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.20,
    shadowRadius: 24,
    elevation: 8,
  } as ViewStyle,
  clipWrap: {
    borderRadius: radius.xxl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(212,37,28,0.18)',
  },
  heroInner: {
    padding: 26,
    paddingBottom: 24,
    position: 'relative',
  },
  accentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(212,37,28,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(212,37,28,0.25)',
  },
  accentPillText: {
    fontFamily: typography.fonts.sansMedium,
    fontSize: 11,
    color: colors.red,
    letterSpacing: -0.1,
  },
  heroTitle: {
    fontFamily: typography.fonts.display,
    fontSize: 32,
    color: colors.ink,
    letterSpacing: -1.2,
    lineHeight: 34,
    marginTop: 16,
  },
  heroTitleItalic: {
    fontFamily: typography.fonts.displayItalic,
    color: colors.red,
  },
  heroSubtitle: {
    fontSize: 13,
    fontFamily: typography.fonts.sans,
    color: colors.ink2,
    marginTop: 10,
  },
  heroBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 22,
  },
  heroIcons: {
    flexDirection: 'row',
    gap: 6,
  },
  heroIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,253,248,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(26,20,16,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroArrowBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.red,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 6,
  },
});
