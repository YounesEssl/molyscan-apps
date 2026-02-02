import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui';
import { COLORS, SPACING } from '@/constants/theme';
import { useOfflineStore } from '@/stores/offline.store';

export const OfflineBanner: React.FC = () => {
  const { isOffline, pendingActions } = useOfflineStore();

  if (!isOffline) return null;

  return (
    <View style={styles.banner}>
      <Ionicons name="cloud-offline" size={16} color={COLORS.surface} />
      <Text variant="caption" color={COLORS.surface} style={styles.text}>
        Mode hors-ligne{pendingActions > 0 ? ` · ${pendingActions} action(s) en attente` : ''}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: 6,
    backgroundColor: COLORS.warning,
  },
  text: {
    fontWeight: '600',
  },
});
