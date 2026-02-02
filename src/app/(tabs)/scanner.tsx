import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { CameraView } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Text, BottomSheet } from '@/components/ui';
import { ScanOverlay } from '@/components/scanner/ScanOverlay';
import { ScanResult } from '@/components/scanner/ScanResult';
import { PermissionGate } from '@/components/scanner/PermissionGate';
import { ScanModeSwitch } from '@/components/scanner/ScanModeSwitch';
import { VoiceInput } from '@/components/scanner/VoiceInput';
import { useCameraPermission } from '@/hooks/useCameraPermission';
import { useBarcodeScan } from '@/hooks/useBarcodeScan';
import { useScannerStore } from '@/stores/scanner.store';
import { COLORS, SPACING, RADIUS } from '@/constants/theme';

export default function ScannerScreen(): React.JSX.Element {
  const { isLoading, isGranted, requestPermission } = useCameraPermission();
  const {
    handleBarcodeScanned,
    lastScanRecord,
    isScanning,
    flashEnabled,
    toggleFlash,
    resetScan,
  } = useBarcodeScan();
  const { scanMode, setScanMode } = useScannerStore();

  if (isLoading) {
    return (
      <ScreenWrapper style={styles.centered}>
        <Text variant="body">Chargement...</Text>
      </ScreenWrapper>
    );
  }

  if (!isGranted && scanMode === 'camera') {
    return (
      <ScreenWrapper>
        <PermissionGate onRequestPermission={requestPermission} />
      </ScreenWrapper>
    );
  }

  return (
    <View style={styles.container}>
      {scanMode === 'camera' ? (
        <>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            enableTorch={flashEnabled}
            barcodeScannerSettings={{
              barcodeTypes: [
                'ean13',
                'ean8',
                'upc_a',
                'upc_e',
                'code128',
                'code39',
                'qr',
              ],
            }}
            onBarcodeScanned={isScanning ? handleBarcodeScanned : undefined}
          />
          {isScanning && <ScanOverlay />}
        </>
      ) : (
        <VoiceInput
          onResult={(text) => {
            // Simulate a voice scan result
            handleBarcodeScanned({ type: 'qr', data: '3456789012345' } as any);
          }}
        />
      )}

      {/* Top controls */}
      <SafeAreaView style={styles.topControls} edges={['top']}>
        <View style={styles.topRow}>
          <View style={styles.modeContainer}>
            <ScanModeSwitch mode={scanMode} onChange={setScanMode} />
          </View>
          {scanMode === 'camera' && (
            <TouchableOpacity
              style={styles.controlButton}
              onPress={toggleFlash}
              hitSlop={12}
            >
              <Ionicons
                name={flashEnabled ? 'flash' : 'flash-off'}
                size={22}
                color={COLORS.surface}
              />
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>

      {/* Instruction text when scanning */}
      {isScanning && scanMode === 'camera' && (
        <View style={styles.instructionContainer}>
          <Text variant="body" color={COLORS.surface} style={styles.instruction}>
            Placez le code-barres dans le cadre
          </Text>
        </View>
      )}

      {/* Bottom sheet result */}
      <BottomSheet visible={!!lastScanRecord} onClose={resetScan}>
        {lastScanRecord && (
          <ScanResult scan={lastScanRecord} onScanAgain={resetScan} />
        )}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  topControls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: SPACING.lg,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  modeContainer: {
    flex: 1,
    maxWidth: 200,
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructionContainer: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  instruction: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    fontSize: 14,
    fontWeight: '600',
  },
});
