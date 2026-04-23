import React from 'react';
import { TouchableOpacity, StyleSheet, type ViewStyle } from 'react-native';
import { COLORS, RADIUS } from '@/constants/theme';

interface IconButtonProps {
  icon: React.ReactNode;
  backgroundColor?: string;
  onPress: () => void;
  style?: ViewStyle;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  backgroundColor = COLORS.muted,
  onPress,
  style,
}) => (
  <TouchableOpacity
    style={[styles.button, { backgroundColor }, style]}
    onPress={onPress}
    hitSlop={8}
  >
    {icon}
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
