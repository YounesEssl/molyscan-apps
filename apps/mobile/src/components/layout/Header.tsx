import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, type ViewStyle } from 'react-native';
import { AltArrowLeft } from 'react-native-solar-icons/icons/bold';
import { useRouter } from 'expo-router';
import { Text } from '@/components/ui';
import { COLORS, SPACING, RADIUS, SHADOW } from '@/constants/theme';

interface HeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: {
    icon: React.ReactNode;
    onPress: () => void;
  };
}

export const Header: React.FC<HeaderProps> = ({
  title,
  showBack = false,
  onBack,
  rightAction,
}) => {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {showBack ? (
        <TouchableOpacity
          onPress={onBack ?? (() => router.back())}
          style={[styles.iconButton, SHADOW.sm as ViewStyle]}
          hitSlop={8}
        >
          <AltArrowLeft size={22} color={COLORS.text} />
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
          {rightAction.icon}
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
