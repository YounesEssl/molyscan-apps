import React from 'react';
import { TouchableOpacity, StyleSheet, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '@/constants/theme';

interface IconButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  size?: number;
  color?: string;
  backgroundColor?: string;
  onPress: () => void;
  style?: ViewStyle;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  size = 22,
  color = COLORS.text,
  backgroundColor = COLORS.muted,
  onPress,
  style,
}) => (
  <TouchableOpacity
    style={[styles.button, { backgroundColor }, style]}
    onPress={onPress}
    hitSlop={8}
  >
    <Ionicons name={icon} size={size} color={color} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
