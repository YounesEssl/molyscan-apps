import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '@/design/tokens/colors';

interface ScannerViewfinderProps {
  size?: number;
}

export function ScannerViewfinder({
  size = 280,
}: ScannerViewfinderProps): React.JSX.Element {
  return (
    <View
      style={[
        styles.wrapper,
        {
          width: size,
          height: size,
          marginLeft: -size / 2,
          marginTop: -size / 2,
        },
      ]}
      pointerEvents="none"
    >
      <View style={[styles.corner, styles.tl]} />
      <View style={[styles.corner, styles.tr]} />
      <View style={[styles.corner, styles.bl]} />
      <View style={[styles.corner, styles.br]} />
    </View>
  );
}

const CORNER_SHADOW = {
  shadowColor: colors.red,
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.45,
  shadowRadius: 10,
  elevation: 4,
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: '50%',
    top: '42%',
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: colors.red,
    borderWidth: 3,
    ...CORNER_SHADOW,
  },
  tl: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 18,
  },
  tr: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 18,
  },
  bl: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 18,
  },
  br: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 18,
  },
});
