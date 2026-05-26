import { create } from 'zustand';
import * as repo from '@/lib/outbox/repository';

interface OutboxState {
  /** Raw network reachability from NetInfo. */
  networkOnline: boolean;
  /** Manual override for testing the offline path on a connected device. */
  manualOffline: boolean;
  /** Effective connectivity = networkOnline && !manualOffline. */
  isOnline: boolean;
  isSyncing: boolean;
  syncProgress: { current: number; total: number } | null;
  /** Mutations waiting to sync (pending + retrying). */
  pendingCount: number;
  /** Dead-lettered mutations that need manual retry. */
  failedCount: number;
  lastSyncAt: string | null;
  setNetworkOnline: (online: boolean) => void;
  setManualOffline: (manual: boolean) => void;
  setSyncing: (syncing: boolean) => void;
  setSyncProgress: (progress: { current: number; total: number } | null) => void;
  setLastSyncAt: (iso: string) => void;
  refreshCounts: () => Promise<void>;
}

const derive = (networkOnline: boolean, manualOffline: boolean): boolean =>
  networkOnline && !manualOffline;

export const useOutboxStore = create<OutboxState>((set, get) => ({
  networkOnline: true,
  manualOffline: false,
  isOnline: true,
  isSyncing: false,
  syncProgress: null,
  pendingCount: 0,
  failedCount: 0,
  lastSyncAt: null,

  setNetworkOnline: (online) =>
    set({ networkOnline: online, isOnline: derive(online, get().manualOffline) }),
  setManualOffline: (manual) =>
    set({ manualOffline: manual, isOnline: derive(get().networkOnline, manual) }),
  setSyncing: (syncing) => set({ isSyncing: syncing }),
  setSyncProgress: (progress) => set({ syncProgress: progress }),
  setLastSyncAt: (iso) => set({ lastSyncAt: iso }),

  refreshCounts: async () => {
    const { active, failed } = await repo.counts();
    set({ pendingCount: active, failedCount: failed });
  },
}));
