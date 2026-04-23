import React from 'react';
import { View, ScrollView, StyleSheet, type ViewStyle } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/theme';
import { SPACING } from '@/constants/theme';

const TAB_BAR_HEIGHT = 64;

interface ScreenWrapperProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padded?: boolean;
  scroll?: boolean;
  /** Add bottom padding to clear the absolute-positioned tab bar (default: false) */
  tabSafe?: boolean;
}

export const ScreenWrapper: React.FC<ScreenWrapperProps> = ({
  children,
  style,
  padded = true,
  scroll = false,
  tabSafe = false,
}) => {
  const insets = useSafeAreaInsets();
  const bottomPadding = tabSafe ? TAB_BAR_HEIGHT + insets.bottom : 0;

  const content = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[padded && styles.padded, { paddingBottom: bottomPadding }, style]}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, padded && styles.padded, { paddingBottom: bottomPadding }, style]}>
      {children}
    </View>
  );

  return <SafeAreaView style={styles.safe}>{content}</SafeAreaView>;
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  flex: {
    flex: 1,
  },
  padded: {
    paddingHorizontal: SPACING.lg,
  },
});
