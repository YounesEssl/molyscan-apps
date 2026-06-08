import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';
import i18n from '@/i18n';
import { useOutboxStore } from '@/stores/outbox.store';
import { useNotificationStore } from '@/stores/notification.store';
import { processOutbox, type SyncCallbacks } from './syncEngine';
import * as repo from './repository';
import { cleanupOrphans } from './imageStore';

/** Periodic fallback drain so a backlog can't get stranded between events. */
const SAFETY_INTERVAL_MS = 30_000;

const isOnlineNow = (state: { isConnected: boolean | null; isInternetReachable: boolean | null }): boolean =>
  // isInternetReachable is unreliable on Android emulators (returns false even
  // when connected). We rely on isConnected only — actual request failures will
  // trigger the offline fallback naturally.
  !!state.isConnected;

function emitSyncNotification(count: number): void {
  const store = useNotificationStore.getState();
  const notif = {
    id: `notif-sync-${Date.now()}`,
    type: 'system' as const,
    title: i18n.t('sync.completedNotifTitle'),
    body: i18n.t('sync.completedNotifBody', { count }),
    read: false,
    createdAt: new Date().toISOString(),
  };
  useNotificationStore.setState({
    notifications: [notif, ...store.notifications],
    unreadCount: store.unreadCount + 1,
  });
}

function buildCallbacks(): SyncCallbacks {
  return {
    isOnline: () => useOutboxStore.getState().isOnline,
    onProgress: (p) => useOutboxStore.getState().setSyncProgress(p),
    onSyncingChange: (s) => useOutboxStore.getState().setSyncing(s),
    onCountsChange: () => useOutboxStore.getState().refreshCounts(),
    onComplete: (count) => {
      useOutboxStore.getState().setLastSyncAt(new Date().toISOString());
      emitSyncNotification(count);
    },
  };
}

/** Drain the outbox now (no-op if offline or already running). */
export function triggerSync(): void {
  void processOutbox(buildCallbacks());
}

/**
 * One-time outbox bootstrap. Recovers interrupted state, cleans orphan images,
 * wires connectivity/foreground/interval triggers, and kicks an initial drain.
 * Returns a cleanup function.
 */
export async function initOutbox(): Promise<() => void> {
  await repo.recoverInFlight();
  await cleanupOrphans(await repo.activeImagePaths());
  await useOutboxStore.getState().refreshCounts();

  // Keep React Query's notion of online in sync with the device.
  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((state) => setOnline(isOnlineNow(state))),
  );

  const unsubNet = NetInfo.addEventListener((state) => {
    const wasOnline = useOutboxStore.getState().isOnline;
    useOutboxStore.getState().setNetworkOnline(isOnlineNow(state));
    const nowOnline = useOutboxStore.getState().isOnline;
    if (!wasOnline && nowOnline) triggerSync();
  });

  const appStateSub = AppState.addEventListener('change', (next) => {
    if (next === 'active' && useOutboxStore.getState().isOnline) triggerSync();
  });

  const interval = setInterval(() => {
    const s = useOutboxStore.getState();
    if (s.isOnline && !s.isSyncing && s.pendingCount > 0) triggerSync();
  }, SAFETY_INTERVAL_MS);

  triggerSync();

  return () => {
    unsubNet();
    appStateSub.remove();
    clearInterval(interval);
    onlineManager.setEventListener(() => () => {});
  };
}
