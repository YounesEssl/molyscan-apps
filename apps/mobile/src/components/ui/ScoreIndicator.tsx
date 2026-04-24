import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Text } from './Text';
import { colors } from '@/design/tokens/colors';
import { typography } from '@/design/tokens/typography';
import { spacing } from '@/design/tokens/spacing';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ScoreIndicatorProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const SIZES = {
  sm: { radius: 28, stroke: 4, fontSize: typography.sizes.lg },
  md: { radius: 40, stroke: 5, fontSize: typography.sizes.xxl },
  lg: { radius: 56, stroke: 6, fontSize: typography.sizes.xxxl },
};

function getScoreColor(score: number): string {
  if (score >= 80) return colors.ok;
  if (score >= 50) return colors.warn;
  return colors.red;
}

export const ScoreIndicator: React.FC<ScoreIndicatorProps> = ({
  score,
  size = 'md',
  showLabel = true,
}) => {
  const config = SIZES[size];
  const svgSize = (config.radius + config.stroke) * 2;
  const center = svgSize / 2;
  const circumference = 2 * Math.PI * config.radius;
  const scoreColor = getScoreColor(score);

  // Animation
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    animValue.setValue(0);
    Animated.timing(animValue, {
      toValue: score,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [score]);

  const strokeDashoffset = animValue.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, circumference * (1 - 1)], // will be overridden
    extrapolate: 'clamp',
  });

  // For the animated arc, we compute the offset manually since Animated doesn't support complex math
  const finalOffset = circumference * (1 - score / 100);

  return (
    <View style={styles.container}>
      <View style={{ width: svgSize, height: svgSize }}>
        <Svg width={svgSize} height={svgSize}>
          {/* Background arc */}
          <Circle
            cx={center}
            cy={center}
            r={config.radius}
            stroke={colors.ink4}
            strokeWidth={config.stroke}
            fill="none"
            strokeLinecap="round"
            rotation={-90}
            origin={`${center}, ${center}`}
          />
          {/* Score arc */}
          <Circle
            cx={center}
            cy={center}
            r={config.radius}
            stroke={scoreColor}
            strokeWidth={config.stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${circumference}`}
            strokeDashoffset={finalOffset}
            rotation={-90}
            origin={`${center}, ${center}`}
          />
        </Svg>
        {/* Center text */}
        <View style={[StyleSheet.absoluteFill, styles.center]}>
          <Text
            variant="heading"
            style={{ fontSize: config.fontSize, color: scoreColor, fontFamily: typography.fonts.display }}
          >
            {score}
          </Text>
          <Text variant="caption" style={styles.percent}>%</Text>
        </View>
      </View>
      {showLabel && (
        <Text variant="caption" color={colors.ink3} style={styles.label}>
          Score de confiance
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  percent: {
    fontSize: typography.sizes.sm,
    marginTop: 2,
  },
  label: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.sans,
  },
});
