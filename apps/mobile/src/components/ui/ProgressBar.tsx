import React from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS } from '@/constants/theme';

interface ProgressBarProps {
  progress: number; // 0-100
  color?: string;
  height?: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  color = COLORS.accent,
  height = 6,
}) => (
  <View style={[styles.track, { height, borderRadius: height / 2 }]}>
    <View
      style={[
        styles.fill,
        {
          width: `${Math.min(100, Math.max(0, progress))}%`,
          backgroundColor: color,
          height,
          borderRadius: height / 2,
        },
      ]}
    />
  </View>
);

const styles = StyleSheet.create({
  track: {
    backgroundColor: COLORS.muted,
    overflow: 'hidden',
  },
  fill: {},
});
