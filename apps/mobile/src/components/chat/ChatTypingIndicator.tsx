import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Stars } from 'react-native-solar-icons/icons/bold-duotone';
import { Text } from '@/components/ui/Text';
import { colors } from '@/design/tokens/colors';
import { radius } from '@/design/tokens/radius';
import { spacing } from '@/design/tokens/spacing';

export function ChatTypingIndicator(): React.JSX.Element {
  return (
    <View style={styles.row}>
      <LinearGradient
        colors={[colors.purpleVivid, colors.purple]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.avatar}
      >
        <Stars size={12} color="#fff" />
      </LinearGradient>
      <View style={styles.bubble}>
        <ActivityIndicator size="small" color={colors.purple} />
        <Text variant="caption" color={colors.ink2}>
          Réflexion en cours...
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.section,
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.paper2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.ink4,
  },
});
