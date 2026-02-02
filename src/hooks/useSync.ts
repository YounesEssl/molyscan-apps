import { useEffect, useRef, useCallback } from 'react';
import { useOfflineStore } from '@/stores/offline.store';
import { useNotificationStore } from '@/stores/notification.store';
import type { OfflineActionRow } from '@/lib/database';
import { markScanAsSynced, getUnsyncedScans } from '@/lib/database';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface UseSyncReturn {
  isSyncing: boolean;
  syncProgress: { current: number; total: number } | null;
  lastSyncAt: string | null;
  syncNow: () => Promise<void>;
}

export function useSync(): UseSyncReturn {
  const {
    isOffline,
    isSyncing,
    syncProgress,
    lastSyncAt,
    setSyncing,
    setSyncProgress,
    setLastSyncAt,
    getUnsyncedActions,
    removeFromQueue,
    loadPendingCount,
  } = useOfflineStore();

  const wasOffline = useRef(isOffline);

  const syncNow = useCallback(async () => {
    if (isSyncing) return;

    setSyncing(true);

    try {
      // Sync offline actions
      const actions = await getUnsyncedActions();
      // Sync offline scans
      const scans = await getUnsyncedScans();
      const total = actions.length + scans.length;

      if (total === 0) {
        setSyncing(false);
        return;
      }

      setSyncProgress({ current: 0, total });

      let current = 0;

      // Sync actions one by one
      for (const action of actions) {
        await delay(500); // Simulate API call
        await removeFromQueue(action.id);
        current++;
        setSyncProgress({ current, total });
      }

      // Sync scans one by one
      for (const scan of scans) {
        await delay(500); // Simulate API call
        await markScanAsSynced(scan.id);
        current++;
        setSyncProgress({ current, total });
      }

      setLastSyncAt(new Date().toISOString());
      await loadPendingCount();

      // Add in-app notification
      const store = useNotificationStore.getState();
      const notif = {
        id: `notif-sync-${Date.now()}`,
        type: 'system' as const,
        title: 'Synchronisation terminée',
        body: `${total} action(s) synchronisée(s) avec succès`,
        read: false,
        createdAt: new Date().toISOString(),
      };
      useNotificationStore.setState({
        notifications: [notif, ...store.notifications],
        unreadCount: store.unreadCount + 1,
      });
    } catch {
      // Sync failed silently — will retry on next reconnection
    } finally {
      setSyncing(false);
      setSyncProgress(null);
    }
  }, [isSyncing, setSyncing, setSyncProgress, setLastSyncAt, getUnsyncedActions, removeFromQueue, loadPendingCount]);

  // Watch for offline → online transition
  useEffect(() => {
    if (wasOffline.current && !isOffline) {
      syncNow();
    }
    wasOffline.current = isOffline;
  }, [isOffline, syncNow]);

  return { isSyncing, syncProgress, lastSyncAt, syncNow };
}
