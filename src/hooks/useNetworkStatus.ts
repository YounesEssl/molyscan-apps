import { useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useOfflineStore } from '@/stores/offline.store';

export function useNetworkStatus(): void {
  const setNetworkOffline = useOfflineStore((s) => s.setNetworkOffline);
  const loadPendingCount = useOfflineStore((s) => s.loadPendingCount);

  useEffect(() => {
    // Load pending count on mount
    loadPendingCount();

    const unsubscribe = NetInfo.addEventListener((state) => {
      const isDisconnected = !(state.isConnected && state.isInternetReachable !== false);
      setNetworkOffline(isDisconnected);
    });

    return unsubscribe;
  }, [setNetworkOffline, loadPendingCount]);
}
