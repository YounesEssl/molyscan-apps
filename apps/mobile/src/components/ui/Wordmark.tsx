import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle } from 'react-native-svg';
import { Text } from '@/components/ui/Text';
import { colors } from '@/design/tokens/colors';
import { typography } from '@/design/tokens/typography';

interface Logo3Props {
  size?: number;
}

export const Logo3: React.FC<Logo3Props> = ({ size = 32 }) => {
  const br = size * 0.28;
  const iconSize = size * 0.58;
  return (
    <LinearGradient
      colors={['#ff5b50', '#ff3b30', '#c41d12']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.logoContainer, { width: size, height: size, borderRadius: br }]}
    >
      <Svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
        <Path
          d="M12 3s7 7 7 12a7 7 0 0 1-14 0c0-5 7-12 7-12z"
          fill="#fff"
          opacity={0.95}
        />
        <Circle cx={12} cy={14} r={2.5} fill="#ff3b30" />
      </Svg>
    </LinearGradient>
  );
};

interface Wordmark3Props {
  size?: number;
}

export const Wordmark3: React.FC<Wordmark3Props> = ({ size = 20 }) => {
  return (
    <View style={styles.wordmarkRow}>
      <Logo3 size={size * 1.4} />
      <Text
        style={[
          styles.wordmarkText,
          { fontSize: size, letterSpacing: -0.8 },
        ]}
      >
        {'Moly'}
        <Text style={[styles.wordmarkText, { fontSize: size, color: colors.red }]}>
          {'Scan'}
        </Text>
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ff3b30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 7,
    elevation: 6,
  },
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  wordmarkText: {
    fontFamily: typography.fonts.display,
    fontWeight: '400',
    color: colors.ink,
  },
});
