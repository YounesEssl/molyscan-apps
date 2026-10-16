import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { restoreSession } from '@/lib/restoreSession';

export function useSessionRestoration() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  const retry = useRef<() => void>(() => {});

  useEffect(() => {
    let disposed = false;
    let running = false;
    let rerunRequested = false;
    let lastConnected: boolean | null = null;
    const run = async () => {
      if (disposed) return;
      if (running) { rerunRequested = true; return; }
      running = true;
      setStatus('loading');
      try {
        const result = await restoreSession();
        if (!disposed) setStatus(result);
      } catch {
        if (!disposed) setStatus('unavailable');
      } finally {
        running = false;
        if (rerunRequested && !disposed) {
          rerunRequested = false;
          void run();
        }
      }
    };
    retry.current = () => { void run(); };
    void run();
    const appState = AppState.addEventListener('change', (next) => {
      if (next === 'active') void run();
    });
    const unsubscribe = NetInfo.addEventListener((state) => {
      const reconnected = lastConnected === false && state.isConnected === true;
      lastConnected = state.isConnected;
      if (reconnected) void run();
    });
    return () => {
      disposed = true;
      retry.current = () => {};
      appState.remove();
      unsubscribe();
    };
  }, []);

  return { status, retry: () => retry.current() };
}
