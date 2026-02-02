import React from 'react';
import { View, StyleSheet, TouchableOpacity, type ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/ui';
import { COLORS, GRADIENTS, SPACING, RADIUS, SHADOW } from '@/constants/theme';

export const QuickActions: React.FC = () => {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => router.push('/(tabs)/scanner')}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={[...GRADIENTS.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.scanButton, SHADOW.accent as ViewStyle]}
        >
          <View style={styles.scanIconCircle}>
            <Ionicons name="scan" size={28} color={COLORS.accent} />
          </View>
          <Text variant="subheading" color={COLORS.surface}>
            Scanner un produit
          </Text>
        </LinearGradient>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.secondaryButton, SHADOW.sm as ViewStyle]}
        onPress={() => router.push('/(tabs)/history')}
        activeOpacity={0.7}
      >
        <Ionicons name="time-outline" size={22} color={COLORS.primary} />
        <Text variant="body" color={COLORS.primary} style={styles.secondaryText}>
          Historique
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: SPACING.md,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    borderRadius: RADIUS.xl,
    paddingVertical: SPACING.lg - 4,
    paddingHorizontal: SPACING.xl,
  },
  scanIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
  },
  secondaryText: {
    fontWeight: '600',
  },
});
