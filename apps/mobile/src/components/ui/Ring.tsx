import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Text } from '@/components/ui/Text';
import { colors } from '@/design/tokens/colors';
import { typography } from '@/design/tokens/typography';

interface RingProps {
  value?: number;
  size?: number;
  stroke?: number;
}

export const Ring: React.FC<RingProps> = ({
  value = 87,
  size = 132,
  stroke = 10,
}) => {
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - value / 100);

  return (
    <View style={{ width: size, height: size }}>
      <Svg
        width={size}
        height={size}
        style={{ transform: [{ rotate: '-90deg' }] }}
      >
        <Circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="rgba(26,20,16,0.08)"
          strokeWidth={stroke}
        />
        <Circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={colors.red}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <Text
          style={{
            fontFamily: typography.fonts.display,
            fontSize: size * 0.34,
            color: colors.ink,
            letterSpacing: -1.5,
            lineHeight: size * 0.34,
          }}
        >
          {value}
        </Text>
        <Text
          style={{
            fontFamily: typography.fonts.mono,
            fontSize: 9,
            color: 'rgba(26,20,16,0.5)',
            letterSpacing: 1.5,
            marginTop: 2,
          }}
        >
          MATCH
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
