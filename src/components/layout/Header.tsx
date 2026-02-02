import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Text } from '@/components/ui';
import { COLORS, SPACING, RADIUS, SHADOW } from '@/constants/theme';

interface HeaderProps {
  title: string;
  showBack?: boolean;
  rightAction?: {
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
  };
}

export const Header: React.FC<HeaderProps> = ({
  title,
  showBack = false,
  rightAction,
}) => {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {showBack ? (
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.iconButton, SHADOW.sm as ViewStyle]}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
      ) : (
        <View style={styles.iconButton} />
      )}
      <Text variant="subheading" style={styles.title}>
        {title}
      </Text>
      {rightAction ? (
        <TouchableOpacity
          onPress={rightAction.onPress}
          style={[styles.iconButton, SHADOW.sm as ViewStyle]}
          hitSlop={8}
        >
          <Ionicons name={rightAction.icon} size={22} color={COLORS.text} />
        </TouchableOpacity>
      ) : (
        <View style={styles.iconButton} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    textAlign: 'center',
  },
});
