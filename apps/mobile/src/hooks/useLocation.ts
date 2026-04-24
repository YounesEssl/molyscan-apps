import { useCallback } from 'react';
import * as Location from 'expo-location';
import { logger } from '@/lib/logger';
import type { ScanLocation } from '@/schemas/scan.schema';

interface UseLocationReturn {
  getCurrentLocation: () => Promise<ScanLocation | null>;
}

const GPS_TIMEOUT_MS = 5000;
const OVERALL_TIMEOUT_MS = 8000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race<T | null>([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

export function useLocation(): UseLocationReturn {
  const getCurrentLocation = useCallback(async (): Promise<ScanLocation | null> => {
    // Master timeout — no matter what happens inside, return null after 8s.
    // Location is a nice-to-have for scans, never worth blocking the user flow.
    return withTimeout(
      (async (): Promise<ScanLocation | null> => {
        try {
          // IMPORTANT: read-only — do NOT call `requestForegroundPermissionsAsync`
          // during analysis. That call can hang indefinitely if the permission
          // dialog is pending. Only check the current status; permission is
          // requested at a better moment (app launch / explicit user action).
          const { status } = await Location.getForegroundPermissionsAsync();
          if (status !== 'granted') {
            logger.debug(`Location permission status=${status}, skip`);
            return null;
          }

          const position = await withTimeout(
            Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            }),
            GPS_TIMEOUT_MS,
          );
          if (!position) {
            logger.debug('Location GPS timeout, skip');
            return null;
          }

          let label: string | undefined;
          try {
            const results = await withTimeout(
              Location.reverseGeocodeAsync({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
              }),
              2000,
            );
            const address = results?.[0];
            if (address) {
              const parts = [address.name, address.city].filter(Boolean);
              label = parts.join(', ') || undefined;
            }
          } catch {
            // silent: reverse geocode is best-effort
          }

          return {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            label,
          };
        } catch (error) {
          logger.error('Location fetch failed', error);
          return null;
        }
      })(),
      OVERALL_TIMEOUT_MS,
    );
  }, []);

  return { getCurrentLocation };
}
