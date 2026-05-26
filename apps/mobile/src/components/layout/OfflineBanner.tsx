import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Animated, TouchableOpacity, View } from 'react-native';
import { CloundCross } from 'react-native-solar-icons/icons/bold';
import { RefreshCircle } from 'react-native-solar-icons/icons/bold';
import { CheckCircle } from 'react-native-solar-icons/icons/bold';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/ui';
import { colors } from '@/design/tokens/colors';
import { spacing } from '@/design/tokens/spacing';
import { useOutboxStore } from '@/stores/outbox.store';
import { retryAllFailed } from '@/lib/outbox/repository';
import { triggerSync } from '@/lib/outbox/connectivity';

export const OfflineBanner: React.FC = () => {
  const { t } = useTranslation();
  const { isOnline, isSyncing, syncProgress, pendingCount, failedCount, lastSyncAt, refreshCounts } =
    useOutboxStore();
  const [showSynced, setShowSynced] = useState(false);
  const slideAnim = useRef(new Animated.Value(-60)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;

  const isOffline = !isOnline;
  const hasFailures = failedCount > 0;
  const visible = isSyncing || hasFailures || isOffline || showSynced;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 0 : -60,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  useEffect(() => {
    if (isSyncing) {
      const spin = Animated.loop(
        Animated.timing(spinAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      );
      spin.start();
      return () => spin.stop();
    }
    spinAnim.setValue(0);
  }, [isSyncing]);

  useEffect(() => {
    if (!isSyncing && lastSyncAt && isOnline && !hasFailures) {
      setShowSynced(true);
      const timer = setTimeout(() => setShowSynced(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isSyncing, lastSyncAt, isOnline, hasFailures]);

  const spinRotate = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const handleRetry = async (): Promise<void> => {
    await retryAllFailed();
    await refreshCounts();
    triggerSync();
  };

  // Priority: syncing > failures > offline > just-synced confirmation.
  if (isSyncing && syncProgress) {
    return (
      <Animated.View style={[styles.banner, styles.dark, { transform: [{ translateY: slideAnim }] }]}>
        <Animated.View style={{ transform: [{ rotate: spinRotate }] }}>
          <RefreshCircle size={18} color={colors.textOnRed} />
        </Animated.View>
        <Text variant="caption" color={colors.textOnRed} style={styles.text}>
          {t('sync.syncing', { current: syncProgress.current, total: syncProgress.total })}
        </Text>
        <View style={styles.progressTrack}>
          <View
            style={[styles.progressFill, { width: `${(syncProgress.current / syncProgress.total) * 100}%` }]}
          />
        </View>
      </Animated.View>
    );
  }

  if (hasFailures) {
    return (
      <Animated.View style={[styles.wrap, { transform: [{ translateY: slideAnim }] }]}>
        <TouchableOpacity
          style={[styles.banner, styles.failed]}
          onPress={handleRetry}
          accessibilityRole="button"
          accessibilityLabel={t('sync.retry')}
        >
          <RefreshCircle size={18} color={colors.textOnRed} />
          <Text variant="caption" color={colors.textOnRed} style={styles.text}>
            {t('sync.failedCount', { count: failedCount })} — {t('sync.retry')}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  if (isOffline) {
    return (
      <Animated.View style={[styles.banner, styles.dark, { transform: [{ translateY: slideAnim }] }]}>
        <CloundCross size={18} color={colors.textOnRed} />
        <Text variant="caption" color={colors.textOnRed} style={styles.text}>
          {t('sync.offlineMode')}
          {pendingCount > 0 ? ` • ${t('sync.pendingCount', { count: pendingCount })}` : ''}
        </Text>
      </Animated.View>
    );
  }

  if (showSynced) {
    return (
      <Animated.View style={[styles.banner, styles.synced, { transform: [{ translateY: slideAnim }] }]}>
        <CheckCircle size={18} color={colors.textOnRed} />
        <Text variant="caption" color={colors.textOnRed} style={styles.text}>
          {t('sync.allUpToDate')}
        </Text>
      </Animated.View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 8,
    paddingHorizontal: spacing.lg,
    flexWrap: 'wrap',
  },
  dark: {
    backgroundColor: '#1a2540',
  },
  synced: {
    backgroundColor: colors.ok,
  },
  failed: {
    backgroundColor: colors.red,
  },
  text: {
    fontWeight: '600',
  },
  progressTrack: {
    width: '100%',
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    marginTop: 4,
  },
  progressFill: {
    height: 3,
    backgroundColor: colors.paper2,
    borderRadius: 2,
  },
});
