import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  type ViewStyle,
} from 'react-native';
import { COLORS, SHADOW, RADIUS, SPACING } from '@/constants/theme';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  padded?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  onPress,
  style,
  padded = true,
}) => {
  const content = (
    <View
      style={[styles.card, padded && styles.padded, SHADOW.md as ViewStyle, style]}
    >
      {children}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xxl,
  },
  padded: {
    padding: SPACING.xl - 4,
  },
});
