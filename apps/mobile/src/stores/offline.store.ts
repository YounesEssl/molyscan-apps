import { create } from 'zustand';
import {
  insertOfflineAction,
  getUnsyncedCount,
  markActionAsSynced,
  getUnsyncedActions,
  type OfflineActionRow,
} from '@/lib/database';

interface OfflineState {
  isOffline: boolean;
  manualOffline: boolean;
  pendingActions: number;
  isSyncing: boolean;
  syncProgress: { current: number; total: number } | null;
  lastSyncAt: string | null;
  setOffline: (offline: boolean) => void;
  setManualOffline: (manual: boolean) => void;
  setNetworkOffline: (offline: boolean) => void;
  addToQueue: (type: string, payload: Record<string, unknown>) => Promise<void>;
  removeFromQueue: (id: string) => Promise<void>;
  loadPendingCount: () => Promise<void>;
  getUnsyncedActions: () => Promise<OfflineActionRow[]>;
  setSyncing: (syncing: boolean) => void;
  setSyncProgress: (progress: { current: number; total: number } | null) => void;
  setLastSyncAt: (date: string | null) => void;
}

export const useOfflineStore = create<OfflineState>((set, get) => ({
  isOffline: false,
  manualOffline: false,
  pendingActions: 0,
  isSyncing: false,
  syncProgress: null,
  lastSyncAt: null,

  setOffline: (offline) => set({ isOffline: offline }),

  setManualOffline: (manual) => {
    set({ manualOffline: manual, isOffline: manual || get().isOffline });
  },

  setNetworkOffline: (networkOffline) => {
    set({ isOffline: networkOffline || get().manualOffline });
  },

  addToQueue: async (type, payload) => {
    const id = `action-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    await insertOfflineAction(id, type, JSON.stringify(payload));
    const count = await getUnsyncedCount();
    set({ pendingActions: count });
  },

  removeFromQueue: async (id) => {
    await markActionAsSynced(id);
    const count = await getUnsyncedCount();
    set({ pendingActions: count });
  },

  loadPendingCount: async () => {
    const count = await getUnsyncedCount();
    set({ pendingActions: count });
  },

  getUnsyncedActions: async () => {
    return getUnsyncedActions();
  },

  setSyncing: (syncing) => set({ isSyncing: syncing }),
  setSyncProgress: (progress) => set({ syncProgress: progress }),
  setLastSyncAt: (date) => set({ lastSyncAt: date }),
}));
