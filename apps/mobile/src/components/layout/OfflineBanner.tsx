import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { CloundCross } from 'react-native-solar-icons/icons/bold';
import { RefreshCircle } from 'react-native-solar-icons/icons/bold';
import { CheckCircle } from 'react-native-solar-icons/icons/bold';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/ui';
import { colors } from '@/design/tokens/colors';
import { radius } from '@/design/tokens/radius';
import { spacing } from '@/design/tokens/spacing';
import { useOfflineStore } from '@/stores/offline.store';

export const OfflineBanner: React.FC = () => {
  const { t } = useTranslation();
  const { manualOffline, pendingActions, isSyncing, syncProgress, lastSyncAt } = useOfflineStore();
  const [showSynced, setShowSynced] = useState(false);
  const slideAnim = useRef(new Animated.Value(-60)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;

  const shouldShow = isSyncing || showSynced || manualOffline;

  // Slide animation
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: shouldShow ? 0 : -60,
      useNativeDriver: true,
    }).start();
  }, [shouldShow]);

  // Spin animation for sync icon
  useEffect(() => {
    if (isSyncing) {
      const spin = Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      );
      spin.start();
      return () => spin.stop();
    }
    spinAnim.setValue(0);
  }, [isSyncing]);

  // Show "synced" briefly
  useEffect(() => {
    if (!isSyncing && lastSyncAt && !manualOffline) {
      setShowSynced(true);
      const timer = setTimeout(() => setShowSynced(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isSyncing, lastSyncAt, manualOffline]);

  const spinRotate = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (isSyncing && syncProgress) {
    return (
      <Animated.View style={[styles.banner, styles.syncBanner, { transform: [{ translateY: slideAnim }] }]}>
        <Animated.View style={{ transform: [{ rotate: spinRotate }] }}>
          <RefreshCircle size={18} color={colors.textOnRed} />
        </Animated.View>
        <Text variant="caption" color={colors.textOnRed} style={styles.text}>
          {t('sync.syncing', { current: syncProgress.current, total: syncProgress.total })}
        </Text>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${(syncProgress.current / syncProgress.total) * 100}%` },
            ]}
          />
        </View>
      </Animated.View>
    );
  }

  if (showSynced) {
    return (
      <Animated.View style={[styles.banner, styles.syncedBanner, { transform: [{ translateY: slideAnim }] }]}>
        <CheckCircle size={18} color={colors.textOnRed} />
        <Text variant="caption" color={colors.textOnRed} style={styles.text}>
          {t('sync.allUpToDate')}
        </Text>
      </Animated.View>
    );
  }

  if (!manualOffline) return null;

  return (
    <Animated.View style={[styles.banner, { transform: [{ translateY: slideAnim }] }]}>
      <CloundCross size={18} color={colors.textOnRed} />
      <Text variant="caption" color={colors.textOnRed} style={styles.text}>
        {t('sync.offlineMode')}{pendingActions > 0 ? ` • ${pendingActions} ${t('sync.pendingActions', { count: pendingActions })}` : ''}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 8,
    paddingHorizontal: spacing.lg,
    backgroundColor: '#1a2540',
  },
  syncBanner: {
    backgroundColor: '#1a2540',
    flexWrap: 'wrap',
  },
  syncedBanner: {
    backgroundColor: colors.ok,
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
