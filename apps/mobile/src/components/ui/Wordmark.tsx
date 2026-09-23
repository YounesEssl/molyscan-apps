import React from 'react';
import { Image, View, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/Text';
import { colors } from '@/design/tokens/colors';
import { typography } from '@/design/tokens/typography';

interface Logo3Props {
  size?: number;
}

export const Logo3: React.FC<Logo3Props> = ({ size = 32 }) => {
  return (
    <Image
      source={require('../../../assets/images/molyscan-logo.png')}
      style={{ width: size, height: size }}
      resizeMode="contain"
      accessibilityLabel="Molyscan"
    />
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
