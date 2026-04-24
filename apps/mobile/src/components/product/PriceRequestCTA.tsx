import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text as RNText,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/design/tokens/colors';
import { radius } from '@/design/tokens/radius';
import { spacing } from '@/design/tokens/spacing';
import { typography } from '@/design/tokens/typography';
import { haptic } from '@/lib/haptics';

interface PriceRequestCTAProps {
  onPress: () => void;
  label?: string;
}

export function PriceRequestCTA({
  onPress,
  label = 'Demander un prix client',
}: PriceRequestCTAProps): React.JSX.Element {
  return (
    <View style={styles.section}>
      <View style={styles.shadowWrap}>
        <TouchableOpacity
          style={styles.wrapper}
          onPress={() => {
            haptic.medium();
            onPress();
          }}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={label}
        >
          <LinearGradient
            colors={[colors.redVivid, colors.red]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cta}
          >
            <RNText style={styles.text}>{label}</RNText>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: spacing.section,
    marginTop: 20,
  },
  // Outer: shadow + opaque bg (no overflow — would kill the iOS shadow).
  shadowWrap: {
    borderRadius: radius.pill,
    backgroundColor: colors.red,
    shadowColor: colors.red,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  // Inner: clipping for the gradient.
  wrapper: {
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  cta: {
    height: 58,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: typography.fonts.sansSemibold,
    fontSize: 15,
    color: '#fff',
    letterSpacing: -0.2,
  },
});
