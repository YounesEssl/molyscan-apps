import { useEffect } from 'react';
import { initOutbox } from '@/lib/outbox/connectivity';
import { logger } from '@/lib/logger';

/**
 * Boots the offline outbox once for the app lifetime: recovers state, wires
 * connectivity/foreground/interval sync triggers, and cleans up on unmount.
 */
export function useOutbox(): void {
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let cancelled = false;

    initOutbox()
      .then((fn) => {
        if (cancelled) fn();
        else cleanup = fn;
      })
      .catch((error) => logger.error('[outbox] init failed', error));

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);
}
