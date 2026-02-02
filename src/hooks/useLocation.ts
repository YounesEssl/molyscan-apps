import { useCallback } from 'react';
import * as Location from 'expo-location';
import type { ScanLocation } from '@/schemas/scan.schema';

interface UseLocationReturn {
  getCurrentLocation: () => Promise<ScanLocation | null>;
}

export function useLocation(): UseLocationReturn {
  const getCurrentLocation = useCallback(async (): Promise<ScanLocation | null> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('[Location] Permission not granted');
        return null;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      // Reverse geocode for a human-readable label
      let label: string | undefined;
      try {
        const [address] = await Location.reverseGeocodeAsync({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        if (address) {
          const parts = [address.name, address.city].filter(Boolean);
          label = parts.join(', ') || undefined;
        }
      } catch {
        // Reverse geocode failed — continue without label
      }

      return {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        label,
      };
    } catch (error) {
      console.log('[Location] Failed to get position:', error);
      return null;
    }
  }, []);

  return { getCurrentLocation };
}
