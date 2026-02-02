import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, Card } from '@/components/ui';
import { COLORS, SPACING, RADIUS } from '@/constants/theme';
import { useOfflineStore } from '@/stores/offline.store';

interface SyncQueueProps {
  onSyncNow?: () => void;
}

export const SyncQueue: React.FC<SyncQueueProps> = ({ onSyncNow }) => {
  const { pendingActions, isSyncing, syncProgress, lastSyncAt, isOffline } = useOfflineStore();

  if (pendingActions === 0 && !isSyncing) return null;

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconBox, isSyncing && styles.iconBoxSyncing]}>
            <Ionicons
              name={isSyncing ? 'sync' : 'cloud-upload-outline'}
              size={18}
              color={isSyncing ? COLORS.surface : COLORS.warning}
            />
          </View>
          <View>
            <Text variant="body" style={styles.title}>
              {isSyncing ? 'Synchronisation...' : 'Actions en attente'}
            </Text>
            <Text variant="caption" color={COLORS.textMuted}>
              {isSyncing && syncProgress
                ? `${syncProgress.current}/${syncProgress.total} traité(s)`
                : `${pendingActions} action(s) en file d'attente`}
            </Text>
          </View>
        </View>
        {!isSyncing && !isOffline && onSyncNow && pendingActions > 0 && (
          <TouchableOpacity style={styles.syncButton} onPress={onSyncNow}>
            <Ionicons name="refresh" size={16} color={COLORS.surface} />
            <Text variant="caption" color={COLORS.surface} style={styles.syncButtonText}>
              Sync
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {isSyncing && syncProgress && syncProgress.total > 0 && (
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${(syncProgress.current / syncProgress.total) * 100}%` },
            ]}
          />
        </View>
      )}

      {lastSyncAt && !isSyncing && (
        <Text variant="caption" color={COLORS.textMuted} style={styles.lastSync}>
          Dernière sync : {new Date(lastSyncAt).toLocaleString('fr-FR')}
        </Text>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: SPACING.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.warning + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxSyncing: {
    backgroundColor: COLORS.primary,
  },
  title: {
    fontWeight: '700',
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm + 4,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.full,
  },
  syncButtonText: {
    fontWeight: '700',
  },
  progressTrack: {
    height: 4,
    backgroundColor: COLORS.background,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  lastSync: {
    fontSize: 10,
  },
});
