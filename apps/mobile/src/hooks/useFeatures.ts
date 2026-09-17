import { useCallback, useEffect } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useFocusEffect } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth.store';
import { featuresQueryKey, featuresQueryOptions, refreshFeatures } from '@/lib/features';
import { DISABLED_FEATURES } from '@/schemas/features.schema';

export function useFeatures() {
  const userId = useAuthStore((state) => state.user?.id);
  const client = useQueryClient();
  const query = useQuery(featuresQueryOptions(userId));
  const refresh = useCallback(() => refreshFeatures(client, userId), [client, userId]);

  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  useEffect(() => {
    if (!userId) return;
    let networkRevision = 0;
    let lastConnected: boolean | null = null;
    const appState = AppState.addEventListener('change', (next) => {
      if (next === 'active') void refresh();
    });
    const unsubscribeNetwork = NetInfo.addEventListener((state) => {
      if (state.isConnected === lastConnected) return;
      lastConnected = state.isConnected;
      const revision = ++networkRevision;
      if (state.isConnected === false) {
        void client.cancelQueries({ queryKey: featuresQueryKey(userId) }).then(() => {
          if (revision === networkRevision) client.setQueryData(featuresQueryKey(userId), DISABLED_FEATURES);
        });
      } else if (state.isConnected === true) {
        void refresh();
      }
    });
    return () => {
      networkRevision += 1;
      appState.remove();
      unsubscribeNetwork();
    };
  }, [client, refresh, userId]);

  return {
    crmHistoryEditingEnabled: Boolean(userId) && !query.isError && query.data?.crmHistoryEditingEnabled === true,
    isCheckingFeatures: Boolean(userId) && query.isPending,
    refreshFeatures: refresh,
  };
}
