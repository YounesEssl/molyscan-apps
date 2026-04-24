import React from 'react';
import { View, ScrollView, StyleSheet, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/design/tokens/colors';
import { spacing } from '@/design/tokens/spacing';
import { useTabBarSpacing } from '@/hooks/useTabBarSpacing';

interface ScreenWrapperProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padded?: boolean;
  scroll?: boolean;
  /** When true, adds bottom padding so scroll content clears the floating tab bar. */
  tabSafe?: boolean;
  bg?: string;
}

export const ScreenWrapper: React.FC<ScreenWrapperProps> = ({
  children,
  style,
  padded = true,
  scroll = false,
  tabSafe = false,
  bg,
}) => {
  const { contentPaddingBottom } = useTabBarSpacing();
  const bottomPadding = tabSafe ? contentPaddingBottom : 0;
  const backgroundColor = bg ?? colors.paper1;

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

  return <SafeAreaView style={[styles.safe, { backgroundColor }]}>{content}</SafeAreaView>;
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  padded: { paddingHorizontal: spacing.section },
});
