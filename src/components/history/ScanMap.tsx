import React, { useRef, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import MapView, { Marker, Callout, type Region } from 'react-native-maps';
import { useRouter } from 'expo-router';
import { Text } from '@/components/ui';
import { COLORS } from '@/constants/theme';
import type { ScanRecord } from '@/schemas/scan.schema';

interface ScanMapProps {
  scans: ScanRecord[];
}

const STATUS_COLORS: Record<string, string> = {
  matched: COLORS.success,
  partial: COLORS.warning,
  no_match: COLORS.danger,
};

const FRANCE_REGION: Region = {
  latitude: 46.6,
  longitude: 2.5,
  latitudeDelta: 8,
  longitudeDelta: 8,
};

export const ScanMap: React.FC<ScanMapProps> = ({ scans }) => {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);

  const geoScans = scans.filter((s) => s.location !== null);

  useEffect(() => {
    if (geoScans.length > 0 && mapRef.current) {
      const coords = geoScans.map((s) => ({
        latitude: s.location!.lat,
        longitude: s.location!.lng,
      }));
      mapRef.current.fitToCoordinates(coords, {
        edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
        animated: true,
      });
    }
  }, [geoScans]);

  return (
    <MapView
      ref={mapRef}
      style={styles.map}
      initialRegion={FRANCE_REGION}
      showsUserLocation
    >
      {geoScans.map((scan) => (
        <Marker
          key={scan.id}
          coordinate={{
            latitude: scan.location!.lat,
            longitude: scan.location!.lng,
          }}
          pinColor={STATUS_COLORS[scan.status] ?? COLORS.textMuted}
        >
          <Callout onPress={() => router.push(`/product/${scan.id}`)}>
            <Text variant="caption" style={styles.calloutTitle}>
              {scan.scannedProduct.name}
            </Text>
            <Text variant="caption" style={styles.calloutSub}>
              {scan.scannedProduct.brand} · {new Date(scan.scannedAt).toLocaleDateString('fr-FR')}
            </Text>
          </Callout>
        </Marker>
      ))}
    </MapView>
  );
};

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
  calloutTitle: {
    fontWeight: '700',
    color: COLORS.text,
    maxWidth: 200,
  },
  calloutSub: {
    color: COLORS.textSecondary,
  },
});
