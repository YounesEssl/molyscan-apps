import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui';
import { COLORS, SPACING } from '@/constants/theme';
import { useOfflineStore } from '@/stores/offline.store';

export const OfflineBanner: React.FC = () => {
  const { isOffline, pendingActions, isSyncing, syncProgress, lastSyncAt } = useOfflineStore();
  const [showSynced, setShowSynced] = useState(false);

  // Show "all synced" message briefly after sync completes
  useEffect(() => {
    if (!isSyncing && lastSyncAt && !isOffline) {
      setShowSynced(true);
      const timer = setTimeout(() => setShowSynced(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isSyncing, lastSyncAt, isOffline]);

  if (isSyncing && syncProgress) {
    return (
      <View style={[styles.banner, styles.syncBanner]}>
        <Ionicons name="sync" size={16} color={COLORS.surface} />
        <Text variant="caption" color={COLORS.surface} style={styles.text}>
          Synchronisation en cours... ({syncProgress.current}/{syncProgress.total})
        </Text>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${(syncProgress.current / syncProgress.total) * 100}%` },
            ]}
          />
        </View>
      </View>
    );
  }

  if (showSynced) {
    return (
      <View style={[styles.banner, styles.syncedBanner]}>
        <Ionicons name="checkmark-circle" size={16} color={COLORS.surface} />
        <Text variant="caption" color={COLORS.surface} style={styles.text}>
          Tout est à jour
        </Text>
      </View>
    );
  }

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
  syncBanner: {
    backgroundColor: COLORS.primary,
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.md,
  },
  syncedBanner: {
    backgroundColor: COLORS.success,
  },
  text: {
    fontWeight: '600',
  },
  progressTrack: {
    width: '100%',
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    marginTop: 4,
  },
  progressFill: {
    height: 3,
    backgroundColor: COLORS.surface,
    borderRadius: 2,
  },
});
