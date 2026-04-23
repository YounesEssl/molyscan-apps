import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { RefreshCircle } from 'react-native-solar-icons/icons/bold-duotone';
import { CloudUpload } from 'react-native-solar-icons/icons/bold-duotone';
import { useTranslation } from 'react-i18next';
import { Text, Card } from '@/components/ui';
import { COLORS, SPACING, RADIUS } from '@/constants/theme';
import { useOfflineStore } from '@/stores/offline.store';
import i18n from '@/i18n';

interface SyncQueueProps {
  onSyncNow?: () => void;
}

export const SyncQueue: React.FC<SyncQueueProps> = ({ onSyncNow }) => {
  const { t } = useTranslation();
  const { pendingActions, isSyncing, syncProgress, lastSyncAt, isOffline } = useOfflineStore();

  if (pendingActions === 0 && !isSyncing) return null;

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconBox, isSyncing && styles.iconBoxSyncing]}>
            {isSyncing ? (
              <RefreshCircle size={18} color={COLORS.surface} />
            ) : (
              <CloudUpload size={18} color={COLORS.warning} />
            )}
          </View>
          <View>
            <Text variant="body" style={styles.title}>
              {isSyncing ? t('sync.syncingTitle') : t('sync.pendingActionsTitle')}
            </Text>
            <Text variant="caption" color={COLORS.textMuted}>
              {isSyncing && syncProgress
                ? t('sync.processed', { current: syncProgress.current, total: syncProgress.total })
                : t('sync.queued', { count: pendingActions })}
            </Text>
          </View>
        </View>
        {!isSyncing && !isOffline && onSyncNow && pendingActions > 0 && (
          <TouchableOpacity style={styles.syncButton} onPress={onSyncNow}>
            <RefreshCircle size={16} color={COLORS.surface} />
            <Text variant="caption" color={COLORS.surface} style={styles.syncButtonText}>
              {t('sync.syncButton')}
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
          {t('sync.lastSync', { date: new Date(lastSyncAt).toLocaleString(i18n.language === 'en' ? 'en-US' : 'fr-FR') })}
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
